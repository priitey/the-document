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

    var termsNum = 24;
    termExtractor = new TermExtractor(wordpos, termsNum);

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

    const fileInput = document.getElementById('fileInput');
    const sticker = document.getElementById('sticker');
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
        // Store original transform
        const originalTransform = sticker.style.transform;
        const originalPosition = sticker.style.position;

        // Temporarily remove transforms for capture
        sticker.style.transform = 'none';
        sticker.style.position = 'static';

        // Wait a moment for layout to settle
        setTimeout(() => {
            htmlToImage.toPng(sticker, {
                quality: 1,
                backgroundColor: 'white',
                width: 290, // Match your CSS width
                height: 900, // Match your CSS height
            })
                .then(function (dataUrl) {
                    // Restore original styles
                    sticker.style.transform = originalTransform;
                    sticker.style.position = originalPosition;

                    const link = document.createElement('a');
                    link.download = 'sticker.png';
                    link.href = dataUrl;
                    link.click();
                })
                .catch(function (error) {
                    // Restore styles even on error
                    sticker.style.transform = originalTransform;
                    sticker.style.position = originalPosition;

                    console.error('Error generating image:', error);
                    window.print();
                });
        }, 100);
    });

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
        sticker.textContent = ''; // Clear existing content

        const gridDimensions = getGridDimensions(sticker);
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
            if (index === 0) {
                element = document.createElement('img');
                element.className = 'image-container';
                element.alt = term;
                element.style.width = '200%';
                element.style.height = 'auto';
                element.style.objectFit = 'cover';

                // Use the first few terms to search for an image
                const searchTerms = terms.slice(0, 3);
                findImageForSticker(searchTerms, element);
            } else {
                element = document.createElement('span');
                element.className = 'term';
                element.textContent = term;
            }

            const randomIndex = Math.floor(Math.random() * availablePositions.length);
            const selectedPosition = availablePositions[randomIndex];
            availablePositions.splice(randomIndex, 1);

            element.style.gridRow = selectedPosition.row + '/ span 1';
            element.style.gridColumn = selectedPosition.col + '/ span 1';

            sticker.appendChild(element);
        });

        // Helper function to find and set image for the sticker
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
    }
});