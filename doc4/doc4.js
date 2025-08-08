import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
import { TermExtractor } from '../termExtractor.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

document.addEventListener('DOMContentLoaded', function () {
    const wordpos = new WordPOS({
        dictPath: 'https://cdn.jsdelivr.net/npm/wordpos-web@1.0.2/dict'
    });
    const termExtractor = new TermExtractor(wordpos, 100);
    let extractedTerms = null;
    let currentPdf = null;

    const fileInput = document.getElementById('fileInput');
    const reset = document.getElementById('reset');
    const rmxPage = document.getElementById('rmx-page');
    const canvas = document.getElementById('pdf-canvas');
    const ctx = canvas.getContext('2d');
    const homeBtn = document.getElementById('homeBtn');
    const uploadBtn = document.getElementById('uploadBtn');

    homeBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', handleFileSelect);
    reset.addEventListener('click', () => {
        if (currentPdf) {
            processRandomPage(currentPdf);
        }
    });

    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            console.error('Please select a PDF file.');
            return;
        }

        const fileUrl = URL.createObjectURL(file);
        // Store the loaded PDF in our new global variable
        currentPdf = await pdfjsLib.getDocument(fileUrl).promise;
        // Process the first random page
        await processRandomPage(currentPdf);
    }

    async function processRandomPage(pdf) {
        const randomIndex = Math.floor(Math.random() * pdf.numPages) + 1;
        const page = await pdf.getPage(randomIndex);

        const textContent = await page.getTextContent();
        const fullText = textContent.items.map(item => item.str).join(' ');
        await processTextForTerms(fullText);

        renderOriginalPage(page);
        generateRemixedLayout(page, textContent);
    }

    async function renderOriginalPage(page) {
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: ctx, viewport: viewport };
        await page.render(renderContext).promise;
    }

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

    // --- HELPER to get a random term ---
    function getRandomTerm() {
        if (!extractedTerms) return "error";
        const termTypes = Object.keys(extractedTerms);
        const randomType = termTypes[Math.floor(Math.random() * termTypes.length)];
        const termList = extractedTerms[randomType];
        if (!termList || termList.length === 0) return "empty";
        return termList[Math.floor(Math.random() * termList.length)];
    }

    async function generateRemixedLayout(page, textContent) {
        rmxPage.innerHTML = ''; // Clear previous layout
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(rmxPage.clientWidth / viewport.width, rmxPage.clientHeight / viewport.height);

        textContent.items.forEach(item => {
            const [sx, , , sy, x, y] = item.transform;
            const itemWidth = item.width;
            const itemHeight = item.height || (item.transform[3] - item.transform[1]);

            const left = x * scale;
            const top = (viewport.height - y - itemHeight) * scale;
            const width = itemWidth * scale;
            const height = itemHeight * scale;

            const block = document.createElement('div');
            block.className = 'layout-block';
            block.style.left = `${left}px`;
            block.style.top = `${top}px`;
            block.style.width = `${width}px`;
            block.style.height = `${height * 1.4}px`;

            const layoutMod = Math.random();
            let baseContent = '';
            let blockClass = '';

            if (layoutMod < 0.5) { // ~50% chance for Sentence
                const term1 = getRandomTerm();
                const term2 = getRandomTerm();
                const connectors = ["in", "of", "the", "on", "who", "whom", "when", "why", "how", "where", "by", "at"];
                const connector = connectors[Math.floor(Math.random() * connectors.length)];
                baseContent = `${term1} ${connector} ${term2} `;
                blockClass = 'sentence-block';
            } else if (layoutMod > 0.5) { // ~50% chance for Multi-term
                const term = getRandomTerm();
                baseContent = term + ' ';
                blockClass = 'multi-term-block';
            } else { // ~1% chance for Basic
                baseContent = getRandomTerm() + ' ';
                blockClass = 'basic-block';
            }

            block.classList.add(blockClass);

            rmxPage.appendChild(block);

            fillBlockWithContent(block, baseContent);
        });
    }

    /**
     Repeats content within an element until it fills the available space.
     * @param {HTMLElement} block - The block element to fill.
     * @param {string} baseContent - The unit of text to repeat.
     */
    function fillBlockWithContent(block, baseContent) {
        if (!baseContent || baseContent.trim() === '') return;

        // Set initial content
        block.textContent = baseContent;

        // If the base content already overflows, we can't do anything.
        if (block.scrollHeight > block.clientHeight || block.scrollWidth > block.clientWidth) {
            return;
        }

        // Keep appending the base content until it overflows, with a safety break.
        for (let i = 0; i < 100; i++) { 
            const lastGoodContent = block.textContent;
            block.textContent += baseContent;

            // If adding the content caused an overflow, revert to the last good state and stop.
            if (block.scrollHeight > block.clientHeight || block.scrollWidth > block.clientWidth) {
                block.textContent = lastGoodContent;
                break;
            }
        }
    }
});