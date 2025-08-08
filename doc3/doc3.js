import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
import { TermExtractor } from '../termExtractor.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

let wordpos = window.wordpos = new WordPOS({
    dictPath: 'https://cdn.jsdelivr.net/npm/wordpos-web@1.0.2/dict',
    profile: true,
    debug: true,
});
let searchTerms = [];
let termExtractor;
let globalFile = null;

document.addEventListener('DOMContentLoaded', function () {
    var termsNum = 24;
    termExtractor = new TermExtractor(wordpos, termsNum);

    const fileInput = document.getElementById('fileInput');
    const sticker = document.getElementById('sticker');
    const stickerCanvas = document.getElementById('sticker-canvas')
    const colSlider = document.getElementById('cols');
    const rowSlider = document.getElementById('rows');
    const imgToggle = document.getElementById('imgToggle');

    // --- NEW: Event listeners for 98.css buttons ---
    const homeBtn = document.getElementById('homeBtn');
    const uploadBtn = document.getElementById('uploadBtn');

    homeBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click(); // Programmatically click the hidden file input
    });
    // --- End of new code ---

    function extractText(pdfUrl) {
        var pdf = pdfjsLib.getDocument(pdfUrl);
        return pdf.promise.then(function (pdf) {
            var totalPageCount = pdf.numPages;
            var countPromises = [];
            for (
                var currentPage = 1;
                currentPage <= totalPageCount;
                currentPage++
            ) {
                var page = pdf.getPage(currentPage);
                countPromises.push(
                    page.then(function (page) {
                        var textContent = page.getTextContent();
                        return textContent.then(function (text) {
                            return text.items
                                .map(function (s) {
                                    return s.str;
                                })
                                .join('');
                        });
                    }),
                );
            }

            return Promise.all(countPromises).then(function (texts) {
                return texts.join('');
            });
        });
    }

    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
        globalFile = file;
        if (!file) {
            console.error('No file selected');
            return;
        }

        if (file.type !== 'application/pdf') {
            console.error('Please select a PDF file');
            return;
        }

        const fileUrl = URL.createObjectURL(file);

        extractText(fileUrl).then(
            async function (text) {
                // console.log('Extracted text:', text);
                try {
                    const adjs = await termExtractor.getAdjs(text);
                    const nouns = await termExtractor.getNouns(text);
                    const verbs = await termExtractor.getVerbs(text);
                    const adVerbs = await termExtractor.getAdverbs(text);

                    // Helper function to get random items from an array
                    function getRandomItems(array, count) {
                        const items = [];
                        for (let i = 0; i < count && array.length > 0; i++) {
                            const randomIndex = Math.floor(Math.random() * array.length);
                            items.push(array[randomIndex]);
                        }
                        return items;
                    }

                    // Create final array with 4 of each type
                    const finalTerms = [
                        ...getRandomItems(adjs, 4),
                        ...getRandomItems(nouns, 2),
                        ...getRandomItems(verbs, 3),
                        ...getRandomItems(adVerbs, 1)
                    ];

                    // console.log('Final terms array:', finalTerms);
                    // console.log('Final terms count:', finalTerms.length);

                    populateSticker(finalTerms);

                } catch (error) {
                    console.error('Error extracting terms:', error);
                }

                URL.revokeObjectURL(fileUrl);
            },
            function (reason) {
                console.error('Error extracting text:', reason);
                URL.revokeObjectURL(fileUrl);
            }
        );
    });

    // REMOVED: The calcValue function is no longer needed as 98.css styles the sliders.
    // const sliders = document.querySelectorAll('.slider');
    // function calcValue(slider) { ... }

    // MODIFIED: Attach listeners directly to the sliders
    colSlider.addEventListener('input', updateStickerGrid);
    rowSlider.addEventListener('input', updateStickerGrid);

    function updateStickerGrid() {
        const columns = colSlider.value;
        const rows = rowSlider.value;

        // Update grid-template-columns
        stickerCanvas.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

        // Update grid-template-rows (keeping the first row as minmax for header space)
        stickerCanvas.style.gridTemplateRows = `minmax(0, 1fr) repeat(${rows}, minmax(0, 1fr))`;

        // console.log(`Grid updated: ${columns} columns, ${rows} rows`);
    }
    
    // Initialize grid on page load
    updateStickerGrid();

    const resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', function (event) {
        const file = globalFile;
        if (!file) {
            console.error('No file selected');
            return;
        }

        if (file.type !== 'application/pdf') {
            console.error('Please select a PDF file');
            return;
        }

        const fileUrl = URL.createObjectURL(file);

        extractText(fileUrl).then(
            async function (text) {
                // console.log('Extracted text:', text);
                try {
                    const adjs = await termExtractor.getAdjs(text);
                    const nouns = await termExtractor.getNouns(text);
                    const verbs = await termExtractor.getVerbs(text);
                    const adVerbs = await termExtractor.getAdverbs(text);

                    // Helper function to get random items from an array
                    function getRandomItems(array, count) {
                        const items = [];
                        for (let i = 0; i < count && array.length > 0; i++) {
                            const randomIndex = Math.floor(Math.random() * array.length);
                            items.push(array[randomIndex]);
                        }
                        return items;
                    }

                    // Create final array with 4 of each type
                    const finalTerms = [
                        ...getRandomItems(adjs, 4),
                        ...getRandomItems(nouns, 2),
                        ...getRandomItems(verbs, 3),
                        ...getRandomItems(adVerbs, 1)
                    ];

                    // console.log('Final terms array:', finalTerms);
                    // console.log('Final terms count:', finalTerms.length);

                    populateSticker(finalTerms);

                } catch (error) {
                    console.error('Error extracting terms:', error);
                }

                URL.revokeObjectURL(fileUrl);
            },
            function (reason) {
                console.error('Error extracting text:', reason);
                URL.revokeObjectURL(fileUrl);
            }
        );
    });
    const dloadButton = document.getElementById('download');
    dloadButton.addEventListener('click', function (event) {
        console.log('Download button clicked!');

        // Check if htmlToImage is loaded
        if (typeof htmlToImage === 'undefined') {
            console.error('htmlToImage library not loaded, falling back to print');
            // window.print();
            return;
        }

        // Prevent multiple downloads
        if (this.disabled || this.dataset.processing === 'true') {
            console.log('Download prevented - button disabled or processing');
            return;
        }

        this.disabled = true;
        this.dataset.processing = 'true';

        // Store original styles
        const originalTransform = stickerCanvas.style.transform;
        const originalPosition = stickerCanvas.style.position;

        // Temporarily modify for capture
        // stickerCanvas.style.transform = 'none';
        // stickerCanvas.style.position = 'static';


        setTimeout(() => {
            htmlToImage.toPng(stickerCanvas, {
                quality: 1,
                backgroundColor: 'white',
                width: 290,
                height: 900,
                cacheBust: true,
                pixelRatio: 1
            })
                .then((dataUrl) => {
                    console.log('Image generation successful!');

                    // Restore styles
                    stickerCanvas.style.transform = originalTransform;
                    stickerCanvas.style.position = originalPosition;

                    // Create floating modal overlay
                    createImageModal(dataUrl);

                    this.disabled = false;
                    this.dataset.processing = 'false';
                })
                .catch((error) => {
                    console.error('Image generation failed:', error);

                    // Restore styles
                    stickerCanvas.style.transform = originalTransform;
                    stickerCanvas.style.position = originalPosition;

                    this.disabled = false;
                    this.dataset.processing = 'false';

                    // Fallback to print
                    // window.print();
                });
        }, 200);
    });

    function createImageModal(dataUrl) {
        // Remove any existing modal
        const existingModal = document.getElementById('image-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'image-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(5px);
        `;

        // Create modal content container
        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
        `;

        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '✕';
        closeButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 5px;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        // closeButton.onmouseover = () => closeButton.style.background = '#f0f0f0';
        // closeButton.onmouseout = () => closeButton.style.background = 'none';

        // Create image element
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.cssText = `
            max-width: 100%;
            max-height: 70vh;
            object-fit: contain;
            border: 1px solid #ddd;
            border-radius: 5px;
        `;

        // Create instruction text
        const instructions = document.createElement('p');
        instructions.textContent = 'Right-click the image and select "Save As" to download';
        instructions.style.cssText = `
            margin: 0;
            color: #666;
            text-align: center;
            font-family: 'Times New Roman', serif;
        `;

        // Close modal functionality
        function closeModal() {
            modal.remove();
        }

        closeButton.addEventListener('click', closeModal);

        // Close when clicking outside the modal content
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close with Escape key
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        });

        // Assemble modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(instructions);
        modalContent.appendChild(img);
        modal.appendChild(modalContent);

        // Add to page
        document.body.appendChild(modal);
    }

    function getGridDimensions(element) {
        const computedStyle = window.getComputedStyle(element);
        const gridTemplateColumns = computedStyle.gridTemplateColumns;
        const gridTemplateRows = computedStyle.gridTemplateRows;

        // Count columns by splitting on spaces and filtering out empty strings
        const columnCount = gridTemplateColumns.split(/\s+/).filter(val => val.length > 0).length;

        // For rows, we need to handle the "minmax(0, 1fr) repeat(30, minmax(0, 1fr))" pattern
        const rowString = gridTemplateRows;

        let totalRows;
        if (rowString.includes('repeat(')) {
            // Parse repeat() function
            const repeatMatch = rowString.match(/repeat\((\d+),/);
            const repeatCount = repeatMatch ? parseInt(repeatMatch[1]) : 0;

            // Count non-repeat values (the initial minmax(0, 1fr))
            const nonRepeatValues = rowString.replace(/repeat\([^)]+\)/g, '').split(/\s+/).filter(val => val.length > 0).length;

            totalRows = nonRepeatValues + repeatCount;
        } else {
            // Simple case: just count all values
            totalRows = rowString.split(/\s+/).filter(val => val.length > 0).length;
        }

        return {
            columns: columnCount,
            rows: totalRows,
            contentRows: totalRows - 0 // Assuming first row is header
        };
    }

    function populateSticker(terms) {
        stickerCanvas.textContent = ''; // Clear existing content

        const gridDimensions = getGridDimensions(stickerCanvas);
        console.log('Grid dimensions:', gridDimensions);

        // Create array of all possible positions
        const availablePositions = [];
        for (let row = 2; row <= gridDimensions.rows; row++) {
            for (let col = 1; col <= gridDimensions.columns; col++) {
                availablePositions.push({ row, col });
            }
        }

        terms.forEach((term, index) => {
            if (availablePositions.length === 0) {
                console.warn('No more available positions for term:', term);
                return;
            }

            let element;
            if (index === 0 && imgToggle.checked || index === 0 && imgToggle.ariaChecked) {
                element = document.createElement('img');
                element.className = 'image-container';
                element.alt = term;
                element.style.width = '200%';
                element.style.height = 'auto';
                element.style.objectFit = 'cover';

                const searchTerms = terms.slice(0, 3);
                findImageForSticker(searchTerms, element);
            } else {
                element = document.createElement('span');
                element.className = 'term';
                element.textContent = term;

                const layoutMod = Math.random();

                if (layoutMod < 0.1) {
                    element.classList.remove('term');
                    element.classList.add('multi-term');
                    element.textContent = multiTerm(term, 10);
                } else if (layoutMod > 0.4 && layoutMod < 0.5) {
                    element.classList.add('big-term');
                    element.textContent = term;
                } else if (layoutMod > 0.8) {
                    element.textContent = "";
                } else if (layoutMod > 0.2 && layoutMod < 0.3) {
                    element.classList.add('sentence');
                    const firstTerms = terms.slice(0, 3);
                    element.textContent = firstTerms.join(' ');
                } else if (layoutMod > 0.5 && layoutMod < 0.8) {
                    const randTerms = terms.slice(4, 7);
                    const connectors = ["in", "of", "the", "on", "who", "whom", "when", "why", "how", "where", "by", "at"];
                    const randIndex = Math.floor(Math.random() * connectors.length);
                    const connector = connectors[randIndex];
                    const insertPosition = Math.floor(Math.random() * (randTerms.length + 1));
                    const termsWithConnector = [...randTerms];
                    termsWithConnector.splice(insertPosition, 0, connector);
                    element.classList.add('sentence');
                    element.textContent = termsWithConnector.join(' ');
                }
            }

            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const selectedPosition = availablePositions[randomIndex];
            availablePositions.splice(randomIndex, 1);

            element.style.gridRow = selectedPosition.row + '/ span 1';
            element.style.gridColumn = selectedPosition.col + '/ span 1';

            stickerCanvas.appendChild(element);
        });

        // Helper function to find and set image for the stickerCanvas
        function findImageForSticker(searchTerms, imgElement) {
            // Use your existing findImage logic but set the src on the passed element
            const searchQuery = searchTerms.join(' ');
            const searchUrl = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(searchQuery)}&limit=10&fields=id,title,artist_display,image_id`;

            fetch(searchUrl)
                .then(response => response.json())
                .then(data => {
                    if (data.data && data.data.length > 0) {
                        const artworksWithImages = data.data.filter(artwork => artwork.image_id);
                        if (artworksWithImages.length > 0) {
                            const randomIndex = Math.floor(Math.random() * artworksWithImages.length);
                            const selectedArtwork = artworksWithImages[randomIndex];
                            imgElement.src = `https://www.artic.edu/iiif/2/${selectedArtwork.image_id}/full/400,/0/default.jpg`;
                        }
                    }
                })
                .catch(error => {
                    console.error('Error fetching artwork for sticker:', error);
                });
        }
        // Multi term and line repeat function
        function multiTerm(string, factor) {
            return Array(factor).fill(string).join(" ");
        }
    }
});