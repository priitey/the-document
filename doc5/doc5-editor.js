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
            block.style.height = `${height * 1.8}px`;

            const layoutMod = Math.random();
            let baseContent = '';
            let blockClass = '';

            if (layoutMod < 0.5) {
                const term1 = getRandomTerm();
                const term2 = getRandomTerm();
                const connectors = ["in", "of", "the", "on", "who", "whom", "when", "why", "how", "where", "by", "at"];
                const connector = connectors[Math.floor(Math.random() * connectors.length)];
                baseContent = `${term1} ${connector} ${term2} `;
                blockClass = 'sentence-block';
            } else if (layoutMod < 0.8) {
                const term = getRandomTerm();
                baseContent = term + ' ';
                blockClass = 'multi-term-block';
            } else {
                baseContent = getRandomTerm() + ' ';
                blockClass = 'basic-block';
            }

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