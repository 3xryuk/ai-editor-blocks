<?php
/**
 * Interactive Blocks class for AI Editor Blocks.
 *
 * This class handles the frontend rendering of interactive components
 * like Sliders, Tabs, and Accordions created from core/group blocks.
 *
 * @package AI_Editor_Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class AIEB_Interactive_Blocks {

	/**
	 * Track if Swiper assets have been enqueued.
	 *
	 * @var bool
	 */
	private static $swiper_enqueued = false;

	/**
	 * Initialize the interactive blocks.
	 */
	public function init() {
		add_filter( 'render_block', array( $this, 'render_interactive_group' ), 10, 2 );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_interactive_assets' ) );
	}

	/**
	 * Render interactive group blocks.
	 *
	 * @param string $block_content The block content.
	 * @param array  $block         The block data.
	 * @return string Modified block content.
	 */
	public function render_interactive_group( $block_content, $block ) {
		// Only process core/group blocks.
		if ( 'core/group' !== $block['blockName'] ) {
			return $block_content;
		}

		$attributes = $block['attrs'] ?? array();

		// Check for slider attribute.
		if ( ! empty( $attributes['isAiSlider'] ) ) {
			return $this->render_slider( $block_content, $block );
		}

		// Check for tabs attribute.
		if ( ! empty( $attributes['isAiTabs'] ) ) {
			return $this->render_tabs( $block_content, $block );
		}

		// Check for accordion attribute.
		if ( ! empty( $attributes['isAiAccordion'] ) ) {
			return $this->render_accordion( $block_content, $block );
		}

		return $block_content;
	}

	/**
	 * Render a slider block.
	 *
	 * @param string $block_content The block content.
	 * @param array  $block         The block data.
	 * @return string Modified block content.
	 */
	private function render_slider( $block_content, $block ) {
		// Mark that we need Swiper assets.
		self::$swiper_enqueued = true;

		// Generate a unique ID for this slider.
		$slider_id = 'ai-slider-' . uniqid();

		// Parse the block content to wrap inner content properly.
		$block_content = $this->wrap_slider_content( $block_content, $slider_id );

		return $block_content;
	}

	/**
	 * Wrap slider content with Swiper structure.
	 *
	 * @param string $block_content The block content.
	 * @param string $slider_id     Unique slider ID.
	 * @return string Modified content.
	 */
	private function wrap_slider_content( $block_content, $slider_id ) {
		if ( empty( $block_content ) ) {
			return $block_content;
		}

		$dom = new DOMDocument();
		libxml_use_internal_errors( true );
		
		// Wrap in a dummy element to ensure a single root and proper encoding
		$html = '<?xml encoding="utf-8" ?><body>' . $block_content . '</body>';
		$dom->loadHTML( $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD );
		libxml_clear_errors();

		$body = $dom->getElementsByTagName( 'body' )->item( 0 );
		if ( ! $body ) {
			return $block_content; // Fallback if parsing fails
		}

		$group_div = null;

		// Find the first element node (the group div)
		foreach ( $body->childNodes as $node ) {
			if ( $node->nodeType === XML_ELEMENT_NODE ) {
				$group_div = $node;
				break;
			}
		}

		if ( $group_div ) {
			$group_div->setAttribute( 'id', $slider_id );
			
			// Add the interactive classes (since we removed the JS save filter)
			$existing_class = $group_div->getAttribute( 'class' );
			$new_classes = 'is-ai-slider swiper';
			if ( $existing_class ) {
				$new_classes = $existing_class . ' ' . $new_classes;
			}
			$group_div->setAttribute( 'class', $new_classes );
			
			$wrapper = $dom->createElement( 'div' );
			$wrapper->setAttribute( 'class', 'swiper-wrapper' );
			
			// Move all children of group_div into swiper-wrapper, wrapping them in swiper-slide
			$children = array();
			foreach ( $group_div->childNodes as $child ) {
				$children[] = $child;
			}
			
			foreach ( $children as $child ) {
				// Skip text nodes that are just whitespace
				if ( $child->nodeType === XML_TEXT_NODE && trim( $child->nodeValue ) === '' ) {
					$group_div->removeChild( $child );
					continue;
				}
				
				$slide = $dom->createElement( 'div' );
				$slide->setAttribute( 'class', 'swiper-slide' );
				$slide->appendChild( $child );
				$wrapper->appendChild( $slide );
			}
			
			$group_div->appendChild( $wrapper );
			
			// Add pagination and navigation
			$pagination = $dom->createElement( 'div' );
			$pagination->setAttribute( 'class', 'swiper-pagination' );
			$group_div->appendChild( $pagination );
			
			$next = $dom->createElement( 'div' );
			$next->setAttribute( 'class', 'swiper-button-next' );
			$group_div->appendChild( $next );
			
			$prev = $dom->createElement( 'div' );
			$prev->setAttribute( 'class', 'swiper-button-prev' );
			$group_div->appendChild( $prev );
		}

		$new_content = '';
		foreach ( $body->childNodes as $child ) {
			$new_content .= $dom->saveHTML( $child );
		}

		// Remove the XML declaration if it was added
		$new_content = str_replace( '<?xml encoding="utf-8" ?>', '', $new_content );

		return $new_content;
	}

	/**
	 * Render a tabs block.
	 *
	 * @param string $block_content The block content.
	 * @param array  $block         The block data.
	 * @return string Modified block content.
	 */
	private function render_tabs( $block_content, $block ) {
		// Generate a unique ID for this tabs component.
		$tabs_id = 'ai-tabs-' . uniqid();

		// Add the unique ID and class to the wrapper.
		$block_content = preg_replace(
			'/class="([^"]*)"/',
			'id="' . esc_attr( $tabs_id ) . '" class="$1 is-ai-tabs"',
			$block_content,
			1
		);

		return $block_content;
	}

	/**
	 * Render an accordion block.
	 *
	 * @param string $block_content The block content.
	 * @param array  $block         The block data.
	 * @return string Modified block content.
	 */
	private function render_accordion( $block_content, $block ) {
		// Generate a unique ID for this accordion component.
		$accordion_id = 'ai-accordion-' . uniqid();

		// Add the unique ID and class to the wrapper.
		$block_content = preg_replace(
			'/class="([^"]*)"/',
			'id="' . esc_attr( $accordion_id ) . '" class="$1 is-ai-accordion"',
			$block_content,
			1
		);

		return $block_content;
	}

	/**
	 * Enqueue assets for interactive blocks.
	 */
	public function enqueue_interactive_assets() {
		// Only enqueue on frontend.
		if ( is_admin() ) {
			return;
		}

		// Check if we need to enqueue Swiper.
		if ( self::$swiper_enqueued || $this->has_interactive_blocks() ) {
			$this->enqueue_swiper_assets();
			$this->enqueue_tabs_assets();
			$this->enqueue_accordion_assets();
		}
	}

	/**
	 * Check if the current page has interactive blocks.
	 *
	 * @return bool True if interactive blocks are found.
	 */
	private function has_interactive_blocks() {
		global $post;

		if ( ! $post || ! isset( $post->post_content ) ) {
			return false;
		}

		$content = $post->post_content;

		// Check for our interactive block markers.
		if (
			strpos( $content, 'isAiSlider' ) !== false ||
			strpos( $content, 'is-ai-slider' ) !== false ||
			strpos( $content, 'isAiTabs' ) !== false ||
			strpos( $content, 'is-ai-tabs' ) !== false ||
			strpos( $content, 'isAiAccordion' ) !== false ||
			strpos( $content, 'is-ai-accordion' ) !== false
		) {
			return true;
		}

		return false;
	}

	/**
	 * Enqueue Swiper.js assets.
	 */
	private function enqueue_swiper_assets() {
		// Enqueue Swiper CSS from CDN.
		wp_enqueue_style(
			'swiper-css',
			'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css',
			array(),
			'11.0.0'
		);

		// Enqueue Swiper JS from CDN.
		wp_enqueue_script(
			'swiper-js',
			'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js',
			array(),
			'11.0.0',
			true
		);

		// Enqueue our custom slider initialization script.
		wp_enqueue_script(
			'aieb-slider-init',
			AIEB_PLUGIN_URL . 'assets/js/slider-init.js',
			array( 'swiper-js' ),
			AIEB_VERSION,
			true
		);
	}

	/**
	 * Enqueue tabs assets.
	 */
	private function enqueue_tabs_assets() {
		// Enqueue tabs CSS.
		wp_enqueue_style(
			'aieb-tabs-css',
			AIEB_PLUGIN_URL . 'assets/css/tabs.css',
			array(),
			AIEB_VERSION
		);

		// Enqueue tabs JS.
		wp_enqueue_script(
			'aieb-tabs-init',
			AIEB_PLUGIN_URL . 'assets/js/tabs-init.js',
			array(),
			AIEB_VERSION,
			true
		);
	}

	/**
	 * Enqueue accordion assets.
	 */
	private function enqueue_accordion_assets() {
		// Enqueue accordion CSS.
		wp_enqueue_style(
			'aieb-accordion-css',
			AIEB_PLUGIN_URL . 'assets/css/accordion.css',
			array(),
			AIEB_VERSION
		);

		// Enqueue accordion JS.
		wp_enqueue_script(
			'aieb-accordion-init',
			AIEB_PLUGIN_URL . 'assets/js/accordion-init.js',
			array(),
			AIEB_VERSION,
			true
		);
	}
}
