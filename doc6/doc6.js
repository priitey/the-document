import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
import { TermExtractor } from '../termExtractor.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

document.addEventListener('DOMContentLoaded', function () {
    // --- SERVICES AND STATE ---
    const wordpos = new WordPOS({ dictPath: 'https://cdn.jsdelivr.net/npm/wordpos-web@1.0.2/dict' });
    const termExtractor = new TermExtractor(wordpos, 100);
    let extractedTerms = null;
    let animatedBlocks = []; // This will hold the state of all our blocks
    let animationFrameId = null;
    let currentPdf = null;
    let shuffledBlockIndices = []; // NEW: To track replacement order

    // --- DOM ELEMENTS ---
    const fileInput = document.getElementById('fileInput');
    const homeBtn = document.getElementById('homeBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const nextStageBtn = document.getElementById('nextStageBtn');
    const shuffleBtn = document.getElementById('shuffleBtn'); // NEW
    const ogPageContainer = document.getElementById('og-page');
    const rmxPage = document.getElementById('rmx-page');

    // --- EVENT LISTENERS ---
    homeBtn.addEventListener('click', () => window.location.href = '../index.html');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    nextStageBtn.addEventListener('click', advanceAnimationStage);
    shuffleBtn.addEventListener('click', loadRandomPage); // NEW

    // --- MODIFIED: New Animation Timeline with Percentage-based Replacement ---
    const animationStages = [
        'INITIAL',
        'REPLACE_10_PERCENT',
        'REPLACE_50_PERCENT',
        'REPLACE_100_PERCENT',
        'SPIRAL',
        'CHAOS_POSITION',
        'CHAOS_MORPH',
        'SINGLE_WORD',
        'RETURN'
    ];
    let currentStageIndex = 0;

    // --- CORE LOGIC ---
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Disable buttons during load
        nextStageBtn.disabled = true;
        shuffleBtn.disabled = true;

        const fileUrl = URL.createObjectURL(file);
        currentPdf = await pdfjsLib.getDocument(fileUrl).promise;

        await loadRandomPage(); // Load the first random page
    }
    async function loadRandomPage() {
        if (!currentPdf) return;

        // Reset animation and layout
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        rmxPage.innerHTML = '';
        animatedBlocks = [];
        currentStageIndex = 0;

        // Get new random page and its text
        const pageNumber = Math.floor(Math.random() * currentPdf.numPages) + 1;
        const page = await currentPdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        // Process this page's text for new terms
        const fullText = textContent.items.map(item => item.str).join(' ');
        await processTextForTerms(fullText);

        // Render and initialize
        await renderOriginalPage(page);
        initializeAnimatedBlocks(page, textContent);

        // NEW: Create a shuffled order for block replacement
        shuffledBlockIndices = animatedBlocks.map((_, i) => i);
        for (let i = shuffledBlockIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledBlockIndices[i], shuffledBlockIndices[j]] = [shuffledBlockIndices[j], shuffledBlockIndices[i]];
        }

        // Start animation and enable controls
        animationLoop();
        nextStageBtn.disabled = false;
        shuffleBtn.disabled = false;
    }

    function initializeAnimatedBlocks(page, textContent) {
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(rmxPage.clientWidth / viewport.width, rmxPage.clientHeight / viewport.height);

        textContent.items.forEach(item => {
            const [sx, , , sy, x, y] = item.transform;
            const itemWidth = item.width;
            const itemHeight = item.height || (sy - item.transform[1]);

            const blockElement = document.createElement('div');
            blockElement.className = 'layout-block';
            blockElement.textContent = item.str;
            rmxPage.appendChild(blockElement);

            const initialState = {
                x: x * scale,
                y: (viewport.height - y - itemHeight) * scale,
                width: itemWidth * scale,
                height: itemHeight * scale + 30,
                rotation: 0,
                opacity: 1,
                fontSize: 8, // NEW: Define a base font size in pixels
            };

            blockElement.style.width = `${initialState.width}px`;
            blockElement.style.overflow = 'hidden';

            animatedBlocks.push({
                element: blockElement,
                originalContent: item.str,
                initialState: { ...initialState },
                ...initialState, // current state
                target: { ...initialState } // target state starts same as initial
            });
        });
    }

    function advanceAnimationStage() {
        // When returning, we loop back to the start.
        if (animationStages[currentStageIndex] === 'RETURN') {
            currentStageIndex = 0;
        } else {
            currentStageIndex++;
        }

        const newStage = animationStages[currentStageIndex];
        console.log("Advancing to stage:", newStage);

        const pageCenterX = rmxPage.clientWidth / 2;
        const pageCenterY = rmxPage.clientHeight / 2;

        // --- Handle the SINGLE_WORD stage logic ---
        if (newStage === 'SINGLE_WORD') {
            const survivorIndex = Math.floor(Math.random() * animatedBlocks.length);
            animatedBlocks.forEach((block, index) => {
                if (index === survivorIndex) {
                    // The survivor moves to the center
                    block.target.x = pageCenterX - (block.width / 2);
                    block.target.y = pageCenterY - (block.height / 2);
                    block.target.rotation = 0;
                    // NEW: Revert font size and height for the survivor to be readable
                    block.target.fontSize = block.initialState.fontSize;
                    block.target.height = block.initialState.height;
                } else {
                    // Others fly off-screen
                    const angle = Math.random() * 2 * Math.PI;
                    block.target.x = pageCenterX + Math.cos(angle) * 2000;
                    block.target.y = pageCenterY + Math.sin(angle) * 2000;
                }
            });
            return; // Skip the main loop for this special case
        }

        // --- Handle all other stages ---
        // NEW: Define random parameters for the spiral stage, calculated once per stage activation
        const spiralTightness = Math.random() * 1.0 + 0.2; // e.g., 0.2 to 1.2
        const spiralMaxRadius = Math.random() * 150 + 100; // e.g., 100 to 250
        const spiralDirection = Math.random() < 0.5 ? 1 : -1;

        animatedBlocks.forEach((block, index) => {
            // Default to initial state for height and font size unless overridden
            block.target.height = block.initialState.height;
            block.target.fontSize = block.initialState.fontSize;

            switch (newStage) {
                case 'INITIAL':
                case 'RETURN': // Return behaves like Initial
                    block.target.x = block.initialState.x;
                    block.target.y = block.initialState.y;
                    block.target.rotation = block.initialState.rotation;
                    block.element.textContent = block.originalContent;
                    break;
                // REMOVED: Old part-of-speech replacement cases.

                // NEW: Percentage-based replacement stages
                case 'REPLACE_10_PERCENT':
                case 'REPLACE_50_PERCENT':
                case 'REPLACE_100_PERCENT':
                    const percentageMap = {
                        'REPLACE_10_PERCENT': 0.1,
                        'REPLACE_50_PERCENT': 0.5,
                        'REPLACE_100_PERCENT': 1.0
                    };
                    const replaceThreshold = Math.floor(animatedBlocks.length * percentageMap[newStage]);
                    
                    // Determine if this block should be replaced based on its position in the shuffled list
                    const isReplaced = shuffledBlockIndices.indexOf(index) < replaceThreshold;

                    if (isReplaced) {
                        updateBlockText(block, generateComplexContent);
                    } else {
                        block.element.textContent = block.originalContent;
                    }
                    break;

                case 'SPIRAL':
                    // MODIFIED: Use the new random parameters
                    const angle = spiralTightness * index * spiralDirection;
                    const radius = spiralMaxRadius * (index / animatedBlocks.length);
                    block.target.x = pageCenterX + radius * Math.cos(angle) - (block.width / 2);
                    block.target.y = pageCenterY + radius * Math.sin(angle) - (block.height / 2);
                    block.target.rotation = angle * (180 / Math.PI);
                    break;
                // REMOVED: Old 'CHAOS' case is replaced by the two below
                case 'CHAOS_POSITION':
                    block.target.x = Math.random() * rmxPage.clientWidth;
                    block.target.y = Math.random() * rmxPage.clientHeight;
                    block.target.rotation = Math.random() * 360;
                    // Height and font size are already reset to initial by the default above
                    break;
                case 'CHAOS_MORPH':
                    // Keep the chaotic position from the previous stage's target
                    block.target.x = block.x;
                    block.target.y = block.y;
                    block.target.rotation = block.rotation;
                    // Augment height and font size
                    block.target.height = block.initialState.height * 5.5;
                    block.target.fontSize = Math.random() * (100 - 1) + 1;
                    break;
            }
        });
    }

    /**
     * NEW: Fills a block's fixed width with repeating text.
     * @param {object} block - The animated block object.
     * @param {function} textGenerator - A function that returns the string to repeat.
     */
    function updateBlockText(block, textGenerator) {
        const baseText = textGenerator();
        if (!baseText || baseText.trim() === '') {
             block.element.textContent = ''; // Clear if no text
             return;
        }
        // Repeat the text many times. The block's fixed width and overflow:hidden
        // will handle clipping it to the correct visual size.
        const repeatedText = (baseText + ' ').repeat(50);
        block.element.textContent = repeatedText;
    }

    function animationLoop() {
        const lerpFactor = 0.05; // Controls the speed of the animation

        animatedBlocks.forEach(block => {
            // LERP all properties
            block.x = lerp(block.x, block.target.x, lerpFactor);
            block.y = lerp(block.y, block.target.y, lerpFactor);
            block.rotation = lerp(block.rotation, block.target.rotation, lerpFactor);
            block.height = lerp(block.height, block.target.height, lerpFactor); // NEW
            block.fontSize = lerp(block.fontSize, block.target.fontSize, lerpFactor); // NEW

            // Apply the new state to the DOM element
            const style = block.element.style;
            style.left = `${block.x}px`;
            style.top = `${block.y}px`;
            style.transform = `rotate(${block.rotation}deg)`;
            style.height = `${block.height}px`; // NEW
            style.fontSize = `${block.fontSize}px`; // NEW
        });

        animationFrameId = requestAnimationFrame(animationLoop);
    }

    // --- HELPER FUNCTIONS ---
    function lerp(start, end, amount) {
        return start + (end - start) * amount;
    }

    async function renderOriginalPage(page) {
        ogPageContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ogPageContainer.appendChild(canvas);
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;
    }

    async function processTextForTerms(text) {
        const adjs = await termExtractor.getAdjs(text);
        const nouns = await termExtractor.getNouns(text);
        const verbs = await termExtractor.getVerbs(text);
        const adverbs = await termExtractor.getAdverbs(text);
        extractedTerms = { adjs, nouns, verbs, adverbs };
    }

    /**
     * MODIFIED: Can now get a term from a specific category.
     * @param {string|null} type - The category (e.g., 'nouns') or null for any.
     */
    function getRandomTerm(type = null) {
        if (!extractedTerms) return "error";
        
        let termList;
        if (type && extractedTerms[type] && extractedTerms[type].length > 0) {
            termList = extractedTerms[type];
        } else {
            // Fallback to a random category if the requested one is invalid or empty
            const termTypes = Object.keys(extractedTerms).filter(t => extractedTerms[t].length > 0);
            if (termTypes.length === 0) return "empty";
            const randomType = termTypes[Math.floor(Math.random() * termTypes.length)];
            termList = extractedTerms[randomType];
        }
        
        return termList[Math.floor(Math.random() * termList.length)];
    }

    /**
     * NEW: Generates complex sentences like in doc5.
     */
    function generateComplexContent() {
        const layoutMod = Math.random();
        if (layoutMod < 0.33) { // Simple sentence
            const connectors = ["in", "of", "the", "on", "by", "at"];
            const connector = connectors[Math.floor(Math.random() * connectors.length)];
            return `${getRandomTerm()} ${connector} ${getRandomTerm()}`;
        } else if (layoutMod < 0.66) { // Multi-term
            return (getRandomTerm() + ' ').repeat(Math.ceil(Math.random() * 4));
        } else { // Basic term
            return getRandomTerm();
        }
    }
});