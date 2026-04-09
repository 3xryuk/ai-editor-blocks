<?php
/**
 * Plugin Name: AI Editor Blocks
 * Description: AI-powered blocks for the WordPress Gutenberg editor. Generate content, create interactive components, and enhance your editing workflow with artificial intelligence.
 * Version: 1.0.7
 * Author: Youcef Elbahi
 * Text Domain: ai-editor-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

// Define plugin constants.
define( 'AIEB_VERSION', '1.0.7' );
define( 'AIEB_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'AIEB_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Include the settings class.
require_once AIEB_PLUGIN_DIR . 'includes/class-aieb-settings.php';

// Include the API proxy class.
require_once AIEB_PLUGIN_DIR . 'includes/class-aieb-api-proxy.php';

// Include the interactive blocks class.
require_once AIEB_PLUGIN_DIR . 'includes/class-aieb-interactive-blocks.php';

// Initialize the plugin.
function aieb_init() {
	if ( is_admin() ) {
		$settings = new AIEB_Settings();
		$settings->init();
	}

	// Initialize the API proxy (needed for REST API).
	$api_proxy = new AIEB_API_Proxy();
	$api_proxy->init();

	// Initialize the interactive blocks.
	$interactive_blocks = new AIEB_Interactive_Blocks();
	$interactive_blocks->init();
}
add_action( 'plugins_loaded', 'aieb_init' );

/**
 * Registers the block using the metadata loaded from the `block.json` file.
 * Behind the scenes, it registers also all assets so they can be enqueued
 * through the block editor in the corresponding context.
 *
 * @see https://developer.wordpress.org/reference/functions/register_block_type/
 */
function aieb_ai_gen_block_block_init() {
	register_block_type( __DIR__ . '/build' );
}
add_action( 'init', 'aieb_ai_gen_block_block_init' );

/**
 * Pass settings to the block editor script.
 */
function aieb_enqueue_block_editor_assets() {
	$theme_data = array();
	if ( class_exists( 'WP_Theme_JSON_Resolver' ) ) {
		$theme_json = WP_Theme_JSON_Resolver::get_merged_data();
		if ( $theme_json ) {
			$theme_settings = $theme_json->get_settings();
			if ( isset( $theme_settings['color']['palette'] ) ) {
				$theme_data['colors'] = $theme_settings['color']['palette'];
			}
			if ( isset( $theme_settings['typography']['fontFamilies'] ) ) {
				$theme_data['fonts'] = $theme_settings['typography']['fontFamilies'];
			}
		}
	}

	// Get settings from the options table (stored as array under 'aieb_settings').
	$saved_settings = get_option( 'aieb_settings', array() );

	// Load the AI skill context.
	$ai_skill_path = AIEB_PLUGIN_DIR . 'includes/gutenberg-ai-skill.md';
	$ai_skill_content = file_exists( $ai_skill_path ) ? file_get_contents( $ai_skill_path ) : '';

	$settings = array(
		'apiKey'    => isset( $saved_settings['api_key'] ) ? $saved_settings['api_key'] : '',
		'apiUrl'    => isset( $saved_settings['api_url'] ) ? $saved_settings['api_url'] : 'https://api.openai.com/v1/chat/completions',
		'model'     => isset( $saved_settings['model_name'] ) ? $saved_settings['model_name'] : 'gpt-4o',
		'themeData' => $theme_data,
		'aiSkill'   => $ai_skill_content,
	);

	wp_add_inline_script(
		'ai-editor-blocks-ai-gen-block-editor-script',
		'window.aiebSettings = ' . wp_json_encode( $settings ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', 'aieb_enqueue_block_editor_assets' );
