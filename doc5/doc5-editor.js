import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
import { TermExtractor } from '../termExtractor.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

document.addEventListener('DOMContentLoaded', function () {
    // Single, reliable initialization of services
    const wordpos = new WordPOS({
        dictPath: 'https://cdn.jsdelivr.net/npm/wordpos-web@1.0.2/dict'
    });
    const termExtractor = new TermExtractor(wordpos, 100);

    // State variables
    let extractedTerms = null;
    let currentPdf = null;      // Stores the loaded PDF document

    // DOM element references
    const fileInput = document.getElementById('fileInput');
    const newPageBtn = document.getElementById('newPage');
    const genBook = document.getElementById('book');
    const ogPageContainer = document.getElementById('og-page'); 
    const rmxPages = document.querySelectorAll('.rmx-page');

    // --- EVENT LISTENERS ---
    fileInput.addEventListener('change', handleFileSelect);
    newPageBtn.addEventListener('click', () => {
        if (currentPdf) {
            // When "New Page" is clicked, run the full generation sequence again
            generateNewBookFromRandomPage(currentPdf);
        } else {
            alert("Please upload a PDF first.");
        }
    });

    // --- LOGIC FUNCTIONS ---
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            console.error('Please select a PDF file.');
            return;
        }
        const fileUrl = URL.createObjectURL(file);
        currentPdf = await pdfjsLib.getDocument(fileUrl).promise;
        
        // Process the first random page and generate the book upon successful upload
        await generateNewBookFromRandomPage(currentPdf);
    }
    /**
     * NEW: Master function that controls the entire book generation process.
     * This is called on initial upload and on every "New Page" click.
     * @param {pdfjsLib.PDFDocumentProxy} pdf - The loaded PDF document.
     */
    async function generateNewBookFromRandomPage(pdf) {
        // 1. Select a new random page and get its content
        const randomIndex = Math.floor(Math.random() * pdf.numPages) + 1;
        const page = await pdf.getPage(randomIndex);
        const textContent = await page.getTextContent();

        // 2. Extract terms from the new page's text
        const fullText = textContent.items.map(item => item.str).join(' ');
        await processTextForTerms(fullText);

        // 3. Render the new original page to the canvas
        await renderOriginalPage(page);

        // 4. Populate all the remixed page elements based on the new content
        populateAllRemixedPages(page, textContent);
    }

    async function renderOriginalPage(page) {
        // --- MODIFIED: Re-create the canvas every time ---
        
        // 1. Clear the container
        ogPageContainer.innerHTML = '';

        // 2. Create a new canvas element
        const canvas = document.createElement('canvas');
        canvas.id = 'pdf-canvas';
        const ctx = canvas.getContext('2d');

        // 3. Append the new canvas to the container
        ogPageContainer.appendChild(canvas);

        // 4. Render the PDF page onto the new canvas
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: ctx, viewport: viewport };
        await page.render(renderContext).promise;
    }
    // OG PAGE HANDLING ABOVE
    // OG PAGE HANDLING ABOVE
    // OG PAGE HANDLING ABOVE

    // REMIX PAGE HANDLING BELOW
    // REMIX PAGE HANDLING BELOW
    // REMIX PAGE HANDLING BELOW

    async function processTextForTerms(text) {
        try {
            const adjs = await termExtractor.getAdjs(text);
            const nouns = await termExtractor.getNouns(text);
            const verbs = await termExtractor.getVerbs(text);
            const adverbs = await termExtractor.getAdverbs(text);
            extractedTerms = { adjs, nouns, verbs, adverbs };
            console.log("Terms extracted successfully:", extractedTerms);
        } catch (error) {
            console.error("Failed to extract terms:", error);
            extractedTerms = null;
        }
    }

    function getRandomTerm() {
        if (!extractedTerms) return "error";
        const termTypes = Object.keys(extractedTerms);
        const randomType = termTypes[Math.floor(Math.random() * termTypes.length)];
        const termList = extractedTerms[randomType];
        if (!termList || termList.length === 0) return "empty";
        return termList[Math.floor(Math.random() * termList.length)];
    }

    function populateAllRemixedPages(page, textContent) {
        rmxPages.forEach((pageElement, index) => {
            const config = { pageIndex: index };
            generateRemixedLayout(pageElement, page, textContent, config);
        });
    }

    function generateRemixedLayout(targetPageElement, page, textContent, config) {
        targetPageElement.innerHTML = '';
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(targetPageElement.clientWidth / viewport.width, targetPageElement.clientHeight / viewport.height);

        // --- 1. Define manipulation rules based on page index ---
        let textReplacementChance = 0;
        let layoutShiftPercentage = 0;
        let isChaosMode = false;
        let isSingleWordMode = false;

        // There are 10 .rmx-page elements, so we map indices 0-9
        switch (config.pageIndex) {
            case 0: // Page 1: Doc just text and layout
                textReplacementChance = 0;
                break;
            case 1: // Page 2: Slightly changed text (20% replaced)
                textReplacementChance = 0.2;
                break;
            case 2: // Page 3: Mildly changed text (50% replaced)
                textReplacementChance = 0.5;
                break;
            case 3: // Page 4: Fully changed text (100% replaced)
                textReplacementChance = 1.0;
                break;
            case 4: // Page 5: Slightly changed layout (25% shift left)
                textReplacementChance = 1.0;
                layoutShiftPercentage = 0.25;
                break;
            case 5: // Page 6: Mildly changed layout (50% shift left)
                textReplacementChance = 1.0;
                layoutShiftPercentage = 0.5;
                break;
            case 6: // Page 7: Fully changed layout (100% shift left)
                textReplacementChance = 1.0;
                layoutShiftPercentage = 1.0;
                break;
            case 7: // Page 8: Chaos
                isChaosMode = true;
                break;
            case 8: // Page 9: A single word left
                isSingleWordMode = true;
                break;
        }

        // --- 2. Handle special page modes ---

        if (isSingleWordMode) {
            const block = document.createElement('div');
            block.className = 'layout-block';
            block.textContent = getRandomTerm();
            block.style.left = '40%';
            block.style.top = '50%';
            block.style.fontSize = '3em';
            targetPageElement.appendChild(block);
            return; // Stop processing for this page
        }

        if (isChaosMode) {
            textContent.items.forEach(item => {
                const block = document.createElement('div');
                block.className = 'layout-block';

                // Random position, size, and font size
                block.style.left = `${Math.random() * 100}%`;
                block.style.top = `${Math.random() * 100}%`;
                block.style.width = `${Math.random() * 40 + 10}%`; // 10% to 50% width
                block.style.height = `${Math.random() * 15 + 5}%`; // 5% to 20% height
                block.style.fontSize = `${Math.random() * 49.5 + 0.05}em`; // 0.5em to 50em

                // Use the complex random content generator for chaos
                const layoutMod = Math.random();
                let baseContent = '';
                if (layoutMod < 0.5) { // Simple sentence
                    baseContent = `${getRandomTerm()} of ${getRandomTerm()} `;
                } else { // Multi-term
                    baseContent = (getRandomTerm() + ' ').repeat(5);
                }
                
                targetPageElement.appendChild(block);
                fillBlockWithContent(block, baseContent);
            });
            return; // Stop processing after chaos mode
        }

        // --- 3. Standard page generation loop ---

        textContent.items.forEach(item => {
            const [sx, , , sy, x, y] = item.transform;
            const itemWidth = item.width;
            const itemHeight = item.height || (item.transform[3] - item.transform[1]);

            let left = x * scale;
            const top = (viewport.height - y - itemHeight) * scale;
            const width = itemWidth * scale;
            const height = itemHeight * scale;

            // Apply layout shift
            left -= (targetPageElement.clientWidth * layoutShiftPercentage);

            const block = document.createElement('div');
            block.className = 'layout-block';
            block.style.left = `${left}px`;
            block.style.top = `${top}px`;
            block.style.width = `${width}px`;
            
            let baseContent = '';
            let blockClass = '';
            let finalHeight = height * 1.8; // Default height multiplier

            // Apply text replacement logic
            if (Math.random() < textReplacementChance) {
                // Use the complex random content generator
                const layoutMod = Math.random();
                if (layoutMod < 0.25) {
                    const term1 = getRandomTerm();
                    const term2 = getRandomTerm();
                    const connectors = ["in", "of", "the", "on", "who", "whom", "when", "why", "how", "where", "by", "at"];
                    const connector = connectors[Math.floor(Math.random() * connectors.length)];
                    baseContent = `${term1} ${connector} ${term2} `;
                    blockClass = 'small-sentence-block';
                } else if (layoutMod < 0.5) {
                    const connectors = ["in", "of", "the", "on", "who", "whom", "when", "why", "how", "where", "by", "at"];
                    const getRandomConnector = () => connectors[Math.floor(Math.random() * connectors.length)];
                    const terms = Array.from({ length: 10 }, getRandomTerm);
                    baseContent = [terms[0], getRandomConnector(), ...terms.slice(1, 3), getRandomConnector(), ...terms.slice(3, 5), getRandomConnector(), ...terms.slice(5, 7), getRandomConnector(), ...terms.slice(7, 9), getRandomConnector(), terms[9]].join(' ') + ' ';
                    blockClass = 'big-sentence-block';
                    finalHeight = height * 2.5; // Apply specific height for this block type
                } else if (layoutMod < 0.8) {
                    const term = getRandomTerm();
                    baseContent = term + ' ';
                    blockClass = 'multi-term-block';
                } else {
                    baseContent = getRandomTerm() + ' ';
                    blockClass = 'basic-block';
                }
            } else {
                // Use original text
                baseContent = item.str;
                blockClass = 'original-text-block';
            }
            
            block.style.height = `${finalHeight}px`;
            block.classList.add(blockClass);
            targetPageElement.appendChild(block);
            fillBlockWithContent(block, baseContent);
        });
    }

    function fillBlockWithContent(block, baseContent) {
        if (!baseContent || baseContent.trim() === '') return;
        block.textContent = baseContent;
        if (block.scrollHeight > block.clientHeight || block.scrollWidth > block.clientWidth) {
            return;
        }
        for (let i = 0; i < 100; i++) {
            const lastGoodContent = block.textContent;
            block.textContent += baseContent;
            if (block.scrollHeight > block.clientHeight || block.scrollWidth > block.clientWidth) {
                block.textContent = lastGoodContent;
                break;
            }
        }
    }
});