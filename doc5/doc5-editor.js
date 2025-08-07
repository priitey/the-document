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
    let currentPdf = null;

    // DOM element references
    const fileInput = document.getElementById('fileInput');
    const newPageBtn = document.getElementById('newPage');
    const genBook = document.getElementById('book');
    const ogPageContainer = document.getElementById('og-page');
    const rmxPages = document.querySelectorAll('.rmx-page');
    const fcCanvas = document.getElementById('fc-canvas');
    const bcCanvas = document.getElementById('bc-canvas');

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
    genBook.addEventListener('click', generateBookPDF);
    async function generateBookPDF() {
        // --- 1. Setup loading overlay and jsPDF document ---
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        document.body.appendChild(loadingOverlay);

        // Initialize jsPDF. 'p' for portrait, 'mm' for millimeters, 'a6' for page size.
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a6');
        const a6Width = 105;
        const a6Height = 148;

        const pageElements = document.querySelectorAll(
            '#book-container > #front-cover, #book-container > .page-container:has(#og-page), #book-container > .page-container:has(.rmx-page), #book-container > #back-cover'
        );

        // --- 2. Loop through pages, generate images, and add them to the PDF ---
        for (let i = 0; i < pageElements.length; i++) {
            const pageContainer = pageElements[i];
            loadingOverlay.textContent = `Generating Page ${i + 1} / 12...`;

            const contentDiv = pageContainer.querySelector('#first-page, #og-page, .rmx-page, #last-page');
            if (!contentDiv) continue;

            try {
                const dataUrl = await htmlToImage.toPng(contentDiv, {
                    quality: 1.0,
                    pixelRatio: 3 // Use higher pixelRatio for better quality in the PDF
                });

                // If this is not the first page, add a new page to the PDF
                if (i > 0) {
                    doc.addPage();
                }

                // --- 3. Calculate image position for perfect centering ---
                const imgProps = doc.getImageProperties(dataUrl);
                const imgAspectRatio = imgProps.width / imgProps.height;
                
                // Calculate the width the image should have to fill the page height
                const newWidth = a6Height * imgAspectRatio;
                
                // Calculate the x-offset to center the image horizontally
                const xOffset = (a6Width - newWidth) / 2;

                // Add the image to the PDF, filling the height and centered horizontally
                doc.addImage(dataUrl, 'PNG', xOffset, 0, newWidth, a6Height);

            } catch (error) {
                console.error('Could not generate or add page image to PDF:', error, contentDiv);
                // Optionally add a blank page or error text in the PDF
                if (i > 0) doc.addPage();
                doc.text('Error generating this page.', 10, 10);
            }
        }

        // --- 4. Save the generated PDF ---
        loadingOverlay.textContent = 'Saving PDF...';
        doc.save('book.pdf');
        document.body.removeChild(loadingOverlay);
    }

    // --- LOGIC FUNCTIONS ---
    async function handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file || file.type !== 'application/pdf') {
            console.error('Please select a PDF file.');
            return;
        }
        const fileUrl = URL.createObjectURL(file);
        currentPdf = await pdfjsLib.getDocument(fileUrl).promise;

        // --- Render front and back covers (runs only once) ---
        await renderCovers(currentPdf);

        // Process the first random page and generate the book upon successful upload
        await generateNewBookFromRandomPage(currentPdf);
    }

    /**
     * NEW HELPER: Renders the first and last pages to the cover canvases.
     * @param {pdfjsLib.PDFDocumentProxy} pdf - The loaded PDF document.
     */
    async function renderCovers(pdf) {
        // Get the first page (page 1)
        const firstPage = await pdf.getPage(1);
        await renderPageToCanvas(firstPage, fcCanvas);

        // Get the last page
        const lastPage = await pdf.getPage(pdf.numPages);
        await renderPageToCanvas(lastPage, bcCanvas);
    }

    /**
     * Master function that controls the entire book generation process.
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

    /**
     * Renders a given PDF page to a specific canvas element.
     * @param {pdfjsLib.PDFPageProxy} page - The PDF page to render.
     * @param {HTMLCanvasElement} canvas - The target canvas element.
     */
    async function renderPageToCanvas(page, canvas) {
        const ctx = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const renderContext = { canvasContext: ctx, viewport: viewport };
        await page.render(renderContext).promise;
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
        let layoutMode = 'grid'; // 'grid', 'spiral', 'wave'
        let layoutIntensity = 0; // makes the spiral tighter or more open
        let lerpFactor = 0;
        let isChaosMode = false;
        let isSingleWordMode = false;

        // Map a random value from [0, 1) to [10, 100)
        let randIntensity = 10 + Math.random() * 90;

        switch (config.pageIndex) {
            case 0: // Page 1: Doc just text and layout
                textReplacementChance = 0;
                break;
            case 1: // Page 2: Slightly changed text
                textReplacementChance = 0.2;
                break;
            case 2: // Page 3: Mildly changed text
                textReplacementChance = 0.5;
                break;
            case 3: // Page 4: Fully changed text
                textReplacementChance = 1.0;
                break;
            case 4: // Page 5: Slightly changed layout -> Spiral
                textReplacementChance = 1.0;
                layoutMode = 'spiral';
                layoutIntensity = randIntensity;
                lerpFactor = 0.034;
                break;
            case 5: // Page 6: Mildly changed layout -> Wave
                textReplacementChance = 1.0;
                layoutMode = 'spiral';
                layoutIntensity = randIntensity;
                lerpFactor = 0.34;
                break;
            case 6: // Page 7: Fully changed layout -> Intense Spiral
                textReplacementChance = 1.0;
                layoutMode = 'spiral';
                layoutIntensity = randIntensity;
                lerpFactor = 1.0;
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
            block.style.fontSize = '1.0em';
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
                block.style.fontSize = `${Math.random() * 39.5 + 0.01}em`; // 0.5em to 50em

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
            return;
        }

        // --- 3. Standard page generation loop ---
        textContent.items.forEach((item, index) => {
            const [sx, , , sy, x, y] = item.transform;
            const itemWidth = item.width;
            const itemHeight = item.height || (item.transform[3] - item.transform[1]);

            let left, top, transform = '';
            const width = itemWidth * scale;
            const height = itemHeight * scale;

            const initialLeft = x * scale;
            const initialTop = (viewport.height - y - itemHeight) * scale;

            switch (layoutMode) {
                case 'spiral':
                    // Calculate the target spiral position
                    const pageCenterX = targetPageElement.clientWidth / 2;
                    const pageCenterY = targetPageElement.clientHeight / 2;
                    const angle = 0.5 * index;
                    const radius = layoutIntensity * (index / textContent.items.length); // Normalize radius
                    const targetLeft = pageCenterX + radius * Math.cos(angle) - (width / 2);
                    const targetTop = pageCenterY + radius * Math.sin(angle) - (height / 2);

                    // Interpolate between initial and target positions
                    left = initialLeft + (targetLeft - initialLeft) * lerpFactor;
                    top = initialTop + (targetTop - initialTop) * lerpFactor;
                    const rotationInRad = angle * lerpFactor;
                    transform = `rotate(${rotationInRad}rad)`;
                    break;

                case 'wave':
                    const waveAmplitude = layoutIntensity;
                    const waveFrequency = 0.02;
                    left = (x * scale);
                    // The new 'top' is the original 'y' plus a sine wave offset
                    top = (viewport.height - y - itemHeight) * scale + waveAmplitude * Math.sin(left * waveFrequency);
                    break;

                case 'grid':
                default:
                    // The default rectangular grid layout
                    left = x * scale;
                    top = (viewport.height - y - itemHeight) * scale;
                    break;
            }

            const block = document.createElement('div');
            block.className = 'layout-block';
            block.style.left = `${left}px`;
            block.style.top = `${top}px`;
            block.style.width = `${width}px`;
            block.style.transform = transform;

            let baseContent = '';
            let blockClass = '';
            let finalHeight = height * 1.8;

            if (Math.random() < textReplacementChance) {
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
                    finalHeight = height * 2.5;
                } else if (layoutMod < 0.8) {
                    const term = getRandomTerm();
                    baseContent = term + ' ';
                    blockClass = 'multi-term-block';
                } else {
                    baseContent = getRandomTerm() + ' ';
                    blockClass = 'basic-block';
                }
            } else {
                baseContent = item.str;
                blockClass = 'original-text-block';
            }

            block.style.height = `${finalHeight}px`;
            block.classList.add(blockClass);
            targetPageElement.appendChild(block);
            fillBlockWithContent(block, baseContent);

            if (config.pageIndex <= 2) {
                adjustFontSizeToFit(block);
            }
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

    /**
     * NEW: Reduces font size of a block until its content no longer overflows.
     * @param {HTMLElement} block - The block element to adjust.
     */
    function adjustFontSizeToFit(block) {
        const minFontSize = 4; // Minimum font size in pixels to prevent it from disappearing

        // Loop with a safety break to prevent infinite loops
        for (let i = 0; i < 25; i++) {
            // Check for overflow. If it fits, we're done.
            if (block.scrollHeight <= block.clientHeight && block.scrollWidth <= block.clientWidth) {
                break;
            }

            // Get the current font size in pixels
            const computedStyle = window.getComputedStyle(block);
            let currentFontSize = parseFloat(computedStyle.fontSize);

            // If we've hit the minimum size, stop trying
            if (currentFontSize <= minFontSize) {
                break;
            }

            // Reduce the font size by 1px
            const newSize = Math.max(minFontSize, currentFontSize - 1);
            block.style.fontSize = `${newSize}px`;
        }
    }
});