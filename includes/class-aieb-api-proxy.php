<?php
/**
 * API Proxy class for AI Editor Blocks.
 * 
 * This class handles REST API requests from the frontend and proxies them
 * to the external AI API, avoiding CORS issues.
 *
 * @package AI_Editor_Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class AIEB_API_Proxy {

	/**
	 * REST API namespace.
	 */
	const REST_NAMESPACE = 'ai-editor-blocks/v1';

	/**
	 * REST route base.
	 */
	const REST_ROUTE = '/generate';

	/**
	 * Initialize the API proxy.
	 */
	public function init() {
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	/**
	 * Register REST API routes.
	 */
	public function register_rest_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			self::REST_ROUTE,
			array(
				'methods'             => 'POST',
				'callback'            => array( $this, 'handle_generate_request' ),
				'permission_callback' => array( $this, 'check_permissions' ),
				'args'                => array(
					'prompt' => array(
						'required'    => true,
						'type'        => 'string',
						'description' => __( 'The prompt to send to the AI API.', 'ai-editor-blocks' ),
						'sanitize_callback' => 'sanitize_textarea_field',
					),
					'systemPrompt' => array(
						'required'    => false,
						'type'        => 'string',
						'description' => __( 'The system prompt to send to the AI API.', 'ai-editor-blocks' ),
						'sanitize_callback' => 'sanitize_textarea_field',
					),
				),
			)
		);
	}

	/**
	 * Check permissions for the REST API endpoint.
	 *
	 * @return bool|WP_Error True if user has permission, WP_Error otherwise.
	 */
	public function check_permissions() {
		// Check if user is logged in and can edit posts.
		if ( ! current_user_can( 'edit_posts' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to access this endpoint.', 'ai-editor-blocks' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Handle the generate request.
	 *
	 * @param WP_REST_Request $request The REST request object.
	 * @return WP_REST_Response|WP_Error The response or error.
	 */
	public function handle_generate_request( $request ) {
		// Get settings from the database.
		$settings = get_option( 'aieb_settings', array() );

		$api_url = isset( $settings['api_url'] ) ? $settings['api_url'] : '';
		$api_key = isset( $settings['api_key'] ) ? $settings['api_key'] : '';
		$model   = isset( $settings['model_name'] ) ? $settings['model_name'] : 'gpt-4o';

		// Validate settings.
		if ( empty( $api_url ) || empty( $api_key ) ) {
			return new WP_Error(
				'missing_settings',
				__( 'API URL or API Key is not configured. Please check the plugin settings.', 'ai-editor-blocks' ),
				array( 'status' => 500 )
			);
		}

		// Get request parameters - try JSON body first, then fall back to params.
		$json_body = $request->get_json_params();
		
		$prompt = '';
		$system_prompt = '';
		
		if ( ! empty( $json_body ) ) {
			$prompt = isset( $json_body['prompt'] ) ? $json_body['prompt'] : '';
			$system_prompt = isset( $json_body['systemPrompt'] ) ? $json_body['systemPrompt'] : '';
		}
		
		// Fall back to regular params if JSON body didn't have the values.
		if ( empty( $prompt ) ) {
			$prompt = $request->get_param( 'prompt' );
		}
		if ( empty( $system_prompt ) ) {
			$system_prompt = $request->get_param( 'systemPrompt' );
		}

		if ( empty( $prompt ) ) {
			return new WP_Error(
				'missing_prompt',
				__( 'Prompt is required.', 'ai-editor-blocks' ),
				array( 'status' => 400 )
			);
		}

		// Build the request body for OpenAI-compatible API.
		$messages = array();

		if ( ! empty( $system_prompt ) ) {
			$messages[] = array(
				'role'    => 'system',
				'content' => $system_prompt,
			);
		}

		$messages[] = array(
			'role'    => 'user',
			'content' => $prompt,
		);

		$request_body = array(
			'model'    => $model,
			'messages' => $messages,
		);

		// Log request details for debugging
		error_log( 'AIEB Request URL: ' . $api_url );
		error_log( 'AIEB Request Body: ' . wp_json_encode( $request_body ) );

		// Ensure the API URL ends with /chat/completions if it's an OpenAI compatible endpoint
		// Cloudflare AI Gateway and OpenAI both require this endpoint for chat completions
		$request_url = $api_url;
		if ( strpos( $request_url, '/chat/completions' ) === false ) {
			$request_url = rtrim( $request_url, '/' ) . '/chat/completions';
		}

		// Log request details for debugging
		error_log( 'AIEB Request URL: ' . $request_url );
		error_log( 'AIEB Request Body: ' . wp_json_encode( $request_body ) );

		// Make the API request.
		$response = wp_remote_post(
			$request_url,
			array(
				'timeout' => 60,
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => 'Bearer ' . $api_key,
				),
				'body' => wp_json_encode( $request_body ),
			)
		);

		// Check for WP errors.
		if ( is_wp_error( $response ) ) {
			return new WP_Error(
				'api_request_failed',
				sprintf(
					/* translators: %s: error message */
					__( 'API request failed: %s', 'ai-editor-blocks' ),
					$response->get_error_message()
				),
				array( 'status' => 500 )
			);
		}

		// Get response code and body.
		$response_code = wp_remote_retrieve_response_code( $response );
		$response_body = wp_remote_retrieve_body( $response );

		// Log response details for debugging
		error_log( 'AIEB Response Code: ' . $response_code );
		error_log( 'AIEB Response Body: ' . $response_body );

		// Check for API errors.
		if ( $response_code >= 400 ) {
			$error_data = json_decode( $response_body, true );
			$error_message = isset( $error_data['error']['message'] )
				? $error_data['error']['message']
				: __( 'Unknown API error', 'ai-editor-blocks' );

			return new WP_Error(
				'api_error',
				sprintf(
					/* translators: %d: HTTP status code, %s: error message */
					__( 'API Error (%d): %s', 'ai-editor-blocks' ),
					$response_code,
					$error_message
				),
				array(
					'status'  => $response_code,
					'details' => $error_data,
					'debug_url' => $api_url,
					'debug_body' => $request_body,
					'debug_response' => $response_body,
				)
			);
		}

		// Parse the response.
		$parsed_response = json_decode( $response_body, true );

		if ( json_last_error() !== JSON_ERROR_NONE ) {
			return new WP_Error(
				'invalid_response',
				__( 'Invalid JSON response from API.', 'ai-editor-blocks' ),
				array( 'status' => 500 )
			);
		}

		// Return the successful response.
		return new WP_REST_Response(
			array(
				'success' => true,
				'data'    => $parsed_response,
			),
			200
		);
	}
}
