/**
 * Tabs Initialization for AI Editor Blocks.
 *
 * Automatically initializes tab functionality on all .is-ai-tabs elements.
 */
document.addEventListener( 'DOMContentLoaded', function() {
	// Find all AI tabs elements.
	const tabsContainers = document.querySelectorAll( '.is-ai-tabs' );

	tabsContainers.forEach( function( tabsContainer ) {
		// Skip if already initialized.
		if ( tabsContainer.classList.contains( 'ai-tabs-initialized' ) ) {
			return;
		}

		// Mark as initialized.
		tabsContainer.classList.add( 'ai-tabs-initialized' );

		// Find tab buttons and tab panels.
		const tabButtons = tabsContainer.querySelectorAll( '.ai-tab-button' );
		const tabPanels = tabsContainer.querySelectorAll( '.ai-tab-panel' );

		// If no structured tabs found, try to auto-create from children.
		if ( tabButtons.length === 0 ) {
			autoCreateTabs( tabsContainer );
			return;
		}

		// Add click handlers to tab buttons.
		tabButtons.forEach( function( button ) {
			button.addEventListener( 'click', function() {
				const targetId = button.getAttribute( 'data-tab-target' );
				
				// Deactivate all tabs.
				tabButtons.forEach( function( btn ) {
					btn.classList.remove( 'active' );
					btn.setAttribute( 'aria-selected', 'false' );
				} );
				tabPanels.forEach( function( panel ) {
					panel.classList.remove( 'active' );
					panel.setAttribute( 'aria-hidden', 'true' );
				} );

				// Activate clicked tab.
				button.classList.add( 'active' );
				button.setAttribute( 'aria-selected', 'true' );
				
				const targetPanel = tabsContainer.querySelector( targetId );
				if ( targetPanel ) {
					targetPanel.classList.add( 'active' );
					targetPanel.setAttribute( 'aria-hidden', 'false' );
				}
			} );
		} );

		// Activate first tab by default.
		if ( tabButtons.length > 0 && ! tabsContainer.querySelector( '.ai-tab-button.active' ) ) {
			tabButtons[ 0 ].click();
		}
	} );
} );

/**
 * Auto-create tabs from child elements.
 * This handles AI-generated content where structure might be simpler.
 *
 * @param {HTMLElement} container - The tabs container.
 */
function autoCreateTabs( container ) {
	const children = Array.from( container.children );
	
	// Filter out non-element nodes and swiper-wrapper if present.
	const elements = children.filter( function( child ) {
		return child.nodeType === 1 && ! child.classList.contains( 'swiper-wrapper' );
	} );

	if ( elements.length < 2 ) {
		return;
	}

	// Create tab list.
	const tabList = document.createElement( 'div' );
	tabList.className = 'ai-tabs-list';
	tabList.setAttribute( 'role', 'tablist' );

	// Create tab panels container.
	const panelsContainer = document.createElement( 'div' );
	panelsContainer.className = 'ai-tabs-panels';

	// Process each child as a potential tab panel.
	elements.forEach( function( element, index ) {
		const tabId = 'tab-' + Math.random().toString( 36 ).substr( 2, 9 );
		const panelId = 'panel-' + tabId;

		// Try to get tab label from heading or use generic label.
		const heading = element.querySelector( 'h1, h2, h3, h4, h5, h6' );
		const label = heading ? heading.textContent.trim() : 'Tab ' + ( index + 1 );

		// Create tab button.
		const tabButton = document.createElement( 'button' );
		tabButton.className = 'ai-tab-button' + ( index === 0 ? ' active' : '' );
		tabButton.setAttribute( 'role', 'tab' );
		tabButton.setAttribute( 'id', tabId );
		tabButton.setAttribute( 'aria-controls', panelId );
		tabButton.setAttribute( 'aria-selected', index === 0 ? 'true' : 'false' );
		tabButton.setAttribute( 'data-tab-target', '#' + panelId );
		tabButton.textContent = label;

		tabList.appendChild( tabButton );

		// Convert element to tab panel.
		element.classList.add( 'ai-tab-panel' );
		element.setAttribute( 'role', 'tabpanel' );
		element.setAttribute( 'id', panelId );
		element.setAttribute( 'aria-labelledby', tabId );
		element.setAttribute( 'aria-hidden', index === 0 ? 'false' : 'true' );
		if ( index !== 0 ) {
			element.style.display = 'none';
		}

		panelsContainer.appendChild( element );
	} );

	// Insert tab list at the beginning.
	container.insertBefore( tabList, container.firstChild );

	// Add click handlers.
	const tabButtons = tabList.querySelectorAll( '.ai-tab-button' );
	tabButtons.forEach( function( button ) {
		button.addEventListener( 'click', function() {
			const targetId = button.getAttribute( 'data-tab-target' );
			
			// Deactivate all tabs.
			tabButtons.forEach( function( btn ) {
				btn.classList.remove( 'active' );
				btn.setAttribute( 'aria-selected', 'false' );
			} );
			container.querySelectorAll( '.ai-tab-panel' ).forEach( function( panel ) {
				panel.classList.remove( 'active' );
				panel.setAttribute( 'aria-hidden', 'true' );
				panel.style.display = 'none';
			} );

			// Activate clicked tab.
			button.classList.add( 'active' );
			button.setAttribute( 'aria-selected', 'true' );
			
			const targetPanel = container.querySelector( targetId );
			if ( targetPanel ) {
				targetPanel.classList.add( 'active' );
				targetPanel.setAttribute( 'aria-hidden', 'false' );
				targetPanel.style.display = 'block';
			}
		} );
	} );
}
