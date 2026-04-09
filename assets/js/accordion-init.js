/**
 * Accordion Initialization for AI Editor Blocks.
 *
 * Automatically initializes accordion functionality on all .is-ai-accordion elements.
 */
document.addEventListener( 'DOMContentLoaded', function() {
	// Find all AI accordion elements.
	const accordions = document.querySelectorAll( '.is-ai-accordion' );

	accordions.forEach( function( accordion ) {
		// Skip if already initialized.
		if ( accordion.classList.contains( 'ai-accordion-initialized' ) ) {
			return;
		}

		// Mark as initialized.
		accordion.classList.add( 'ai-accordion-initialized' );

		// Find accordion items.
		const items = accordion.querySelectorAll( '.ai-accordion-item' );

		// If no structured items found, try to auto-create from children.
		if ( items.length === 0 ) {
			autoCreateAccordion( accordion );
			return;
		}

		// Add click handlers to accordion headers.
		items.forEach( function( item ) {
			const header = item.querySelector( '.ai-accordion-header' );
			const content = item.querySelector( '.ai-accordion-content' );

			if ( header && content ) {
				header.addEventListener( 'click', function() {
					const isOpen = item.classList.contains( 'open' );

					// Optionally close other items (single-expand mode).
					const allowMultiple = accordion.dataset.multiple === 'true';
					if ( ! allowMultiple && ! isOpen ) {
						items.forEach( function( otherItem ) {
							otherItem.classList.remove( 'open' );
							const otherContent = otherItem.querySelector( '.ai-accordion-content' );
							if ( otherContent ) {
								otherContent.style.maxHeight = null;
								otherContent.setAttribute( 'aria-hidden', 'true' );
							}
							const otherHeader = otherItem.querySelector( '.ai-accordion-header' );
							if ( otherHeader ) {
								otherHeader.setAttribute( 'aria-expanded', 'false' );
							}
						} );
					}

					// Toggle current item.
					item.classList.toggle( 'open' );
					if ( isOpen ) {
						content.style.maxHeight = null;
						content.setAttribute( 'aria-hidden', 'true' );
						header.setAttribute( 'aria-expanded', 'false' );
					} else {
						content.style.maxHeight = content.scrollHeight + 'px';
						content.setAttribute( 'aria-hidden', 'false' );
						header.setAttribute( 'aria-expanded', 'true' );
					}
				} );
			}
		} );
	} );
} );

/**
 * Auto-create accordion from child elements.
 * This handles AI-generated content where structure might be simpler.
 *
 * @param {HTMLElement} container - The accordion container.
 */
function autoCreateAccordion( container ) {
	const children = Array.from( container.children );
	
	// Filter out non-element nodes.
	const elements = children.filter( function( child ) {
		return child.nodeType === 1;
	} );

	if ( elements.length === 0 ) {
		return;
	}

	// Process pairs of elements (heading + content).
	let currentItem = null;
	let itemIndex = 0;

	elements.forEach( function( element ) {
		const tagName = element.tagName.toLowerCase();
		
		// Check if this is a heading (potential accordion header).
		if ( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ].includes( tagName ) ) {
			// Start a new accordion item.
			currentItem = document.createElement( 'div' );
			currentItem.className = 'ai-accordion-item';
			
			const header = document.createElement( 'button' );
			header.className = 'ai-accordion-header';
			header.setAttribute( 'aria-expanded', 'false' );
			header.innerHTML = element.innerHTML + '<span class="ai-accordion-icon">▼</span>';
			
			// Replace heading with the button.
			element.parentNode.replaceChild( header, element );
			currentItem.appendChild( header );
			
			// Create content container.
			const content = document.createElement( 'div' );
			content.className = 'ai-accordion-content';
			content.setAttribute( 'aria-hidden', 'true' );
			currentItem.appendChild( content );
			
			container.appendChild( currentItem );
			itemIndex++;
		} else if ( currentItem ) {
			// Add this element to the current accordion item's content.
			const content = currentItem.querySelector( '.ai-accordion-content' );
			if ( content ) {
				content.appendChild( element );
			}
		}
	} );

	// Re-run initialization for the newly created structure.
	const items = container.querySelectorAll( '.ai-accordion-item' );
	items.forEach( function( item ) {
		const header = item.querySelector( '.ai-accordion-header' );
		const content = item.querySelector( '.ai-accordion-content' );

		if ( header && content ) {
			header.addEventListener( 'click', function() {
				const isOpen = item.classList.contains( 'open' );

				// Close other items.
				items.forEach( function( otherItem ) {
					otherItem.classList.remove( 'open' );
					const otherContent = otherItem.querySelector( '.ai-accordion-content' );
					if ( otherContent ) {
						otherContent.style.maxHeight = null;
						otherContent.setAttribute( 'aria-hidden', 'true' );
					}
					const otherHeader = otherItem.querySelector( '.ai-accordion-header' );
					if ( otherHeader ) {
						otherHeader.setAttribute( 'aria-expanded', 'false' );
					}
				} );

				// Toggle current item.
				item.classList.toggle( 'open' );
				if ( isOpen ) {
					content.style.maxHeight = null;
					content.setAttribute( 'aria-hidden', 'true' );
					header.setAttribute( 'aria-expanded', 'false' );
				} else {
					content.style.maxHeight = content.scrollHeight + 'px';
					content.setAttribute( 'aria-hidden', 'false' );
					header.setAttribute( 'aria-expanded', 'true' );
				}
			} );
		}
	} );
}
