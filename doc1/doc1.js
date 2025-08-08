import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';
import { TermExtractor } from '../termExtractor.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

let wordpos = window.wordpos = new WordPOS({
    // preload: true,
    // dictPath: 'https://unpkg.com/browse/wordpos-web@1.0.0/dict',
    dictPath: 'https://cdn.jsdelivr.net/npm/wordpos-web@1.0.2/dict',
    profile: true,
    debug: true,
    // stopwords: false
});
// let searchTerms = [];

let termExtractor;

document.addEventListener('DOMContentLoaded', function () {
    // Initialize the term extractor with your wordpos instance
    termExtractor = new TermExtractor(wordpos, 50);

    // PDF text extraction here
    // PDF text extraction here
    // PDF text extraction here
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
    const textContainer = document.getElementById('pdf-text');
    const termsContainer = document.getElementById('terms');
    fileInput.addEventListener('change', function (event) {
        const file = event.target.files[0];
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
            function (text) {
                console.log('Extracted text:', text);
                textContainer.textContent = text;
                extractPartsOfSpeech(text);
                URL.revokeObjectURL(fileUrl);
            },
            function (reason) {
                console.error('Error extracting text:', reason);
                textContainer.textContent = 'Error extracting text: ' + reason;
                URL.revokeObjectURL(fileUrl);
            }
        );
    });
    // PDF text extraction here
    // PDF text extraction here
    // PDF text extraction here

    // Adjective, noun, adverb, and verb extraction here
    // Adjective, noun, adverb, and verb extraction here
    // Adjective, noun, adverb, and verb extraction here
    async function extractPartsOfSpeech(textToExtract) {
        try {
            const terms = await termExtractor.getVerbs(textToExtract);

            // Update the DOM separately
            termsContainer.textContent = terms.join(' ');
            console.log('Extracted adjectives:', terms);

            // Use the adjectives to search for images
            if (terms.length > 0) {
                findImage(terms);
            }
        } catch (error) {
            console.error('Error in parts of speech extraction:', error);
        }
    }
    // Adjective, noun, adverb, and verb extraction here
    // Adjective, noun, adverb, and verb extraction here
    // Adjective, noun, adverb, and verb extraction here

    // Search & display image logic here
    // Search & display image logic here
    // Search & display image logic here
    async function findImage(terms) {
        try {
            // Try full search first
            let artwork = await searchArtworks(terms.join(' '));

            if (artwork) {
                displayImage(artwork);
                return;
            }

            // Fallback: try with fewer terms
            console.log('No results with all terms, trying with fewer...');
            artwork = await searchArtworks(terms.slice(0, 3).join(' '));

            if (artwork) {
                displayImage(artwork);
                return;
            }

            // Final fallback: try single terms
            console.log('Trying individual terms...');
            artwork = await searchIndividualTerms(terms);

            if (artwork) {
                displayImage(artwork);
            } else {
                displayNoImageMessage();
            }

        } catch (error) {
            console.error('Error in image search:', error);
            displayErrorMessage();
        }
    }

    function searchArtworks(query) {
        const searchUrl = `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&limit=20&fields=id,title,artist_display,image_id`;

        return fetch(searchUrl)
            .then(response => response.json())
            .then(data => {
                if (data.data && data.data.length > 0) {
                    const artworksWithImages = data.data.filter(artwork => artwork.image_id);
                    if (artworksWithImages.length > 0) {
                        const randomIndex = Math.floor(Math.random() * artworksWithImages.length);
                        return artworksWithImages[randomIndex];
                    }
                }
                return null;
            });
    }

    async function searchIndividualTerms(terms) {
        for (const term of terms) {
            const artwork = await searchArtworks(term);
            if (artwork) {
                return artwork;
            }
        }
        return null;
    }

    function displayImage(artwork) {
        const imageContainer = document.getElementById('image-container');

        // Clear previous content
        imageContainer.innerHTML = '';

        // Create image element
        const img = document.createElement('img');
        img.id = 'poem-image';
        img.src = `https://www.artic.edu/iiif/2/${artwork.image_id}/full/400,/0/default.jpg`;
        img.alt = artwork.title || 'Artwork';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.objectFit = 'contain';
        img.style.filter = 'contrast(175%) brightness(140%) grayscale(100%)';

        // Add loading state
        img.onload = function () {
            imageContainer.appendChild(img);
        };

        img.onerror = function () {
            displayErrorMessage();
        };
    }

    function displayNoImageMessage() {
        const imageContainer = document.getElementById('image-container');
        imageContainer.innerHTML = '<p style="text-align: center; color: #666;">No images found for the search terms.</p>';
    }

    function displayErrorMessage() {
        const imageContainer = document.getElementById('image-container');
        imageContainer.innerHTML = '<p style="text-align: center; color: #cc0000;">Error loading image.</p>';
    }

    const homeBtn = document.getElementById('homeBtn');
    const uploadBtn = document.getElementById('uploadBtn');

    homeBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });

    uploadBtn.addEventListener('click', () => {
        fileInput.click(); // Programmatically click the hidden file input
    });

    fileInput.addEventListener('change', handleFileSelect);
});

async function handleFileSelect(event) {
    const file = event.target.files[0];
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
        function (text) {
            console.log('Extracted text:', text);
            textContainer.textContent = text;
            extractPartsOfSpeech(text);
            URL.revokeObjectURL(fileUrl);
        },
        function (reason) {
            console.error('Error extracting text:', reason);
            textContainer.textContent = 'Error extracting text: ' + reason;
            URL.revokeObjectURL(fileUrl);
        }
    );
}