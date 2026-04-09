/**
 * Swiper Slider Initialization for AI Editor Blocks.
 *
 * Automatically initializes Swiper on all .is-ai-slider elements.
 */
document.addEventListener( 'DOMContentLoaded', function() {
	// Find all AI slider elements.
	const sliders = document.querySelectorAll( '.is-ai-slider' );

	sliders.forEach( function( slider ) {
		// Skip if already initialized.
		if ( slider.classList.contains( 'swiper-initialized' ) ) {
			return;
		}

		// Mark as initialized.
		slider.classList.add( 'swiper-initialized' );

		// Get configuration from data attributes (if any).
		const autoplay = slider.dataset.autoplay !== 'false';
		const loop = slider.dataset.loop !== 'false';
		const delay = parseInt( slider.dataset.delay || '3000', 10 );

		// Initialize Swiper.
		new Swiper( slider, {
			slidesPerView: 1,
			spaceBetween: 0,
			loop: loop,
			autoplay: autoplay ? {
				delay: delay,
				disableOnInteraction: false,
			} : false,
			pagination: {
				el: slider.querySelector( '.swiper-pagination' ),
				clickable: true,
			},
			navigation: {
				nextEl: slider.querySelector( '.swiper-button-next' ),
				prevEl: slider.querySelector( '.swiper-button-prev' ),
			},
			// Ensure proper slide structure.
			watchSlidesProgress: true,
		} );
	} );
} );
