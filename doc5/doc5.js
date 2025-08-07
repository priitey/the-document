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
    if (window.PagedPolyfill) {
        // Move Paged.js content into our preview container
        window.PagedPolyfill.ready.then(() => {
            const pagedContent = document.querySelector('.pagedjs_pages');
            const previewContainer = document.getElementById('preview-container');
            
            if (pagedContent && previewContainer) {
                // Move the paged content into our preview container
                previewContainer.appendChild(pagedContent);
            }
        });
    }

    const generateBtn = document.getElementById('generateBook');
    const downloadBtn = document.getElementById('downloadPDF');
    const fileInput = document.getElementById('fileInput');
    
    generateBtn.addEventListener('click', function() {
        // Show the book content for Paged.js to process
        const bookContent = document.getElementById('book-content');
        bookContent.style.display = 'block';
        
        // Re-run Paged.js
        if (window.PagedPolyfill) {
            window.PagedPolyfill.preview();
        }
    });
    
    downloadBtn.addEventListener('click', function() {
        window.print();
    });
    
    fileInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('File selected:', file.name);
            // Add your file processing logic here
        }
    });
});