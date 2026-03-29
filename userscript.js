// ==UserScript==
// @name         Better HN
// @namespace    https://news.ycombinator.com/
// @version      2026-03-13
// @description  live comments updater & clearer look
// @author       You
// @match        https://news.ycombinator.com/item*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=news.ycombinator.com
// @grant        none
// ==/UserScript==

(function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Keep the comment cell as a positioning context */
        tr.athing.comtr td.default {
            position: relative;
        }

        /*
         * The real hover target.
         * Put it above the comment body so its empty horizontal area can receive hover.
         */
        tr.athing.comtr .hn-topline {
            position: relative !important;
            z-index: 20 !important;
            display: block !important;
            width: 100% !important;
            box-sizing: border-box !important;
        }

        /*
         * Transparent hover slab extending to the right.
         * Hovering this counts as hovering .hn-topline.
         */
        tr.athing.comtr .hn-topline::after {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 0;
            pointer-events: auto;
            background: transparent;
        }

        /* Keep actual topline text/links above the hover slab */
        tr.athing.comtr .hn-topline > * {
            position: relative;
            z-index: 1;
        }

        /* Keep the comment body below the topline hit area */
        tr.athing.comtr td.default > br,
        tr.athing.comtr td.default > .comment {
            position: relative;
            z-index: 1;
        }

        /* Hide vote arrows by default */
        tr.athing.comtr .votelinks {
            opacity: 0;
            transition: opacity 0.15s ease-in-out;
        }

        /* Hide everything after the timestamp by default */
        tr.athing.comtr .hn-hover-meta {
            display: none;
        }

        /* Reveal header controls only when hovering the topline */
        tr.athing.comtr .hn-topline:hover .hn-hover-meta {
            display: inline;
        }

        /* Reveal vote arrows when hovering the topline */
        tr.athing.comtr:has(.hn-topline:hover) .votelinks,
        tr.athing.comtr .votelinks:hover {
            opacity: 1;
        }
    `;
    document.head.appendChild(style);

    function enhanceCommentRow(commentRow) {
        if (!commentRow || commentRow.dataset.hnEnhanced === '1') return;

        const defaultCell = commentRow.querySelector('td.default');
        if (!defaultCell) return;

        const topline = defaultCell.querySelector(':scope > div:first-of-type');
        if (!topline) return;

        topline.classList.add('hn-topline');

        const comhead = topline.querySelector('.comhead');
        const age = comhead && comhead.querySelector('.age');
        if (!comhead || !age) return;

        if (!comhead.querySelector('.hn-hover-meta')) {
            const wrapper = document.createElement('span');
            wrapper.className = 'hn-hover-meta';

            let node = age.nextSibling;
            while (node) {
                const next = node.nextSibling;
                wrapper.appendChild(node);
                node = next;
            }

            comhead.appendChild(wrapper);
        }

        commentRow.dataset.hnEnhanced = '1';
    }

    function enhanceAllComments(root = document) {
        root.querySelectorAll('tr.athing.comtr').forEach(enhanceCommentRow);
    }

    function updateComments() {
        console.log('Starting updateComments at', new Date().toLocaleTimeString());

        fetch(location.href)
            .then(response => response.text())
            .then(responseText => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(responseText, 'text/html');

                const newCommentElems = Array.from(doc.querySelectorAll('tr.athing.comtr'));
                const existingCommentElems = Array.from(document.querySelectorAll('tr.athing.comtr'));
                const existingCommentIDs = new Set(existingCommentElems.map(c => c.id));
                const commentTree = document.querySelector('table.comment-tree');

                let newCommentsFound = false;

                for (let i = 0; i < newCommentElems.length; i++) {
                    const newCommentElem = newCommentElems[i];
                    const commentID = newCommentElem.id;

                    if (!existingCommentIDs.has(commentID)) {
                        newCommentsFound = true;

                        const clonedCommentElem = newCommentElem.cloneNode(true);
                        clonedCommentElem.style.backgroundColor = '#fff8dc';

                        let inserted = false;
                        for (let j = i - 1; j >= 0; j--) {
                            const prevCommentID = newCommentElems[j].id;
                            const prevCommentElem = document.getElementById(prevCommentID);
                            if (prevCommentElem) {
                                prevCommentElem.parentNode.insertBefore(clonedCommentElem, prevCommentElem.nextSibling);
                                inserted = true;
                                break;
                            }
                        }

                        if (!inserted && commentTree) {
                            commentTree.insertBefore(clonedCommentElem, commentTree.firstChild);
                        }

                        enhanceCommentRow(clonedCommentElem);
                    }
                }

                if (newCommentsFound) {
                    console.log('Update complete. New comments have been inserted.');
                }
            })
            .catch(error => {
                console.error('Error fetching comments:', error);
            });
    }

    enhanceAllComments();
    setInterval(updateComments, 10000);
})();
