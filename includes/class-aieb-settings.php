<?php
/**
 * Settings class for AI Editor Blocks.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class AIEB_Settings {

	/**
	 * Option key for the settings array.
	 */
	const OPTION_NAME = 'aieb_settings';

	/**
	 * Initialize the settings class.
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'add_settings_page' ) );
		add_action( 'admin_init', array( $this, 'register_settings' ) );
		add_action( 'admin_init', array( $this, 'handle_delete_settings' ) );
	}

	/**
	 * Add the settings page to the admin menu.
	 */
	public function add_settings_page() {
		add_options_page(
			__( 'AI Editor Blocks Settings', 'ai-editor-blocks' ),
			__( 'AI Editor Blocks', 'ai-editor-blocks' ),
			'manage_options',
			'aieb-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Register the settings and fields.
	 */
	public function register_settings() {
		register_setting(
			'aieb_settings_group',
			self::OPTION_NAME,
			array(
				'sanitize_callback' => array( $this, 'sanitize_settings' ),
				'default'           => array(
					'api_url'    => 'https://api.openai.com/v1/chat/completions',
					'api_key'    => '',
					'model_name' => 'gpt-4o',
				),
			)
		);

		add_settings_section(
			'aieb_main_section',
			__( 'API Configuration', 'ai-editor-blocks' ),
			array( $this, 'render_section_description' ),
			'aieb-settings'
		);

		add_settings_field(
			'api_url',
			__( 'API URL', 'ai-editor-blocks' ),
			array( $this, 'render_api_url_field' ),
			'aieb-settings',
			'aieb_main_section'
		);

		add_settings_field(
			'api_key',
			__( 'API Key', 'ai-editor-blocks' ),
			array( $this, 'render_api_key_field' ),
			'aieb-settings',
			'aieb_main_section'
		);

		add_settings_field(
			'model_name',
			__( 'Model Name', 'ai-editor-blocks' ),
			array( $this, 'render_model_name_field' ),
			'aieb-settings',
			'aieb_main_section'
		);
	}

	/**
	 * Sanitize the settings array.
	 *
	 * @param array $input The input settings.
	 * @return array Sanitized settings.
	 */
	public function sanitize_settings( $input ) {
		$sanitized = array();

		if ( isset( $input['api_url'] ) ) {
			$sanitized['api_url'] = esc_url_raw( $input['api_url'] );
		}

		if ( isset( $input['api_key'] ) ) {
			$sanitized['api_key'] = sanitize_text_field( $input['api_key'] );
		}

		if ( isset( $input['model_name'] ) ) {
			$sanitized['model_name'] = sanitize_text_field( $input['model_name'] );
		}

		return $sanitized;
	}

	/**
	 * Render the section description.
	 */
	public function render_section_description() {
		echo '<p>' . esc_html__( 'Configure the API settings for AI Editor Blocks.', 'ai-editor-blocks' ) . '</p>';
	}

	/**
	 * Render the API URL field.
	 */
	public function render_api_url_field() {
		$options = get_option( self::OPTION_NAME );
		$api_url = isset( $options['api_url'] ) ? $options['api_url'] : 'https://api.openai.com/v1/chat/completions';
		?>
		<input type="url" name="<?php echo esc_attr( self::OPTION_NAME ); ?>[api_url]" value="<?php echo esc_url( $api_url ); ?>" class="regular-text" />
		<p class="description"><?php esc_html_e( 'The endpoint URL for the AI API.', 'ai-editor-blocks' ); ?></p>
		<?php
	}

	/**
	 * Render the API Key field.
	 */
	public function render_api_key_field() {
		$options = get_option( self::OPTION_NAME );
		$api_key = isset( $options['api_key'] ) ? $options['api_key'] : '';
		?>
		<input type="password" name="<?php echo esc_attr( self::OPTION_NAME ); ?>[api_key]" value="<?php echo esc_attr( $api_key ); ?>" class="regular-text" />
		<p class="description"><?php esc_html_e( 'Your API key for authentication.', 'ai-editor-blocks' ); ?></p>
		<?php
	}

	/**
	 * Render the Model Name field.
	 */
	public function render_model_name_field() {
		$options = get_option( self::OPTION_NAME );
		$model_name = isset( $options['model_name'] ) ? $options['model_name'] : 'gpt-4o';
		?>
		<input type="text" name="<?php echo esc_attr( self::OPTION_NAME ); ?>[model_name]" value="<?php echo esc_attr( $model_name ); ?>" class="regular-text" />
		<p class="description"><?php esc_html_e( 'The name of the model to use (e.g., gpt-3.5-turbo, gpt-4o).', 'ai-editor-blocks' ); ?></p>
		<?php
	}

	/**
	 * Handle deletion of settings.
	 */
	public function handle_delete_settings() {
		if ( ! isset( $_POST['aieb_delete_settings'] ) ) {
			return;
		}

		// Verify nonce.
		if ( ! isset( $_POST['aieb_delete_nonce'] ) || ! wp_verify_nonce( $_POST['aieb_delete_nonce'], 'aieb_delete_settings' ) ) {
			add_settings_error(
				'aieb_settings',
				'nonce_failed',
				__( 'Security check failed. Settings were not deleted.', 'ai-editor-blocks' ),
				'error'
			);
			return;
		}

		// Check permissions.
		if ( ! current_user_can( 'manage_options' ) ) {
			add_settings_error(
				'aieb_settings',
				'permission_denied',
				__( 'You do not have permission to delete settings.', 'ai-editor-blocks' ),
				'error'
			);
			return;
		}

		// Delete the option.
		delete_option( self::OPTION_NAME );

		// Add success message.
		add_settings_error(
			'aieb_settings',
			'settings_deleted',
			__( 'All settings have been deleted successfully.', 'ai-editor-blocks' ),
			'success'
		);
	}

	/**
	 * Render the settings page.
	 */
	public function render_settings_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		// Show any settings errors.
		settings_errors( 'aieb_settings' );
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>

			<div class="aieb-branding-buttons" style="margin-bottom: 20px; display: flex; gap: 10px; align-items: center;">
				<a href="https://github.com/3xryuk/ai-editor-blocks" target="_blank" rel="noopener noreferrer" class="button button-secondary" style="display: inline-flex; align-items: center; gap: 8px; padding-left: 12px;">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
						<path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
					</svg>
					<?php esc_html_e( 'GitHub', 'ai-editor-blocks' ); ?>
				</a>
				<a href="https://ko-fi.com/3xryuk" target="_blank" rel="noopener noreferrer" class="button button-secondary" style="display: inline-flex; align-items: center; gap: 8px; padding-left: 12px; background: #00b9fe; border-color: #00b9fe; color: #fff;">
					<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="flex-shrink: 0;">
						<path d="M23.881 7.927c-.274-.732-.977-1.362-1.956-1.362h-6.615c-.495 0-.9.36-.9.801 0 .442.405.802.9.802h5.146l-.732 5.049H14.17l-.732-5.049h3.049c1.955 0 3.556-1.452 3.556-3.445 0-1.417-.901-2.659-2.233-3.195-.63-.27-1.33-.33-1.97-.228a5.721 5.721 0 00-1.577.42L9 6.139v4.412l1.342 9.251c.064.44.45.764.9.764h.732a.9.9 0 00.901-.764l1.097-7.561h.976c1.633 0 3.014-1.208 3.266-2.834.111-.735-.086-1.437-.507-1.99l-.017-.01z"/>
					</svg>
					<?php esc_html_e( 'Ko-fi', 'ai-editor-blocks' ); ?>
				</a>
			</div>

			<form action="options.php" method="post">
				<?php
				settings_fields( 'aieb_settings_group' );
				do_settings_sections( 'aieb-settings' );
				submit_button( __( 'Save Settings', 'ai-editor-blocks' ) );
				?>
			</form>

			<hr />

			<h2><?php esc_html_e( 'Delete Configuration', 'ai-editor-blocks' ); ?></h2>
			<p class="description"><?php esc_html_e( 'This will permanently delete all API settings from the database. You will need to reconfigure the plugin after deletion.', 'ai-editor-blocks' ); ?></p>
			<form method="post" onsubmit="return confirm('<?php esc_attr_e( 'Are you sure you want to delete all settings? This cannot be undone.', 'ai-editor-blocks' ); ?>');">
				<?php wp_nonce_field( 'aieb_delete_settings', 'aieb_delete_nonce' ); ?>
				<input type="hidden" name="aieb_delete_settings" value="1" />
				<button type="submit" class="button button-secondary" style="color: #b32d2e; border-color: #b32d2e;">
					<?php esc_html_e( 'Delete All Settings', 'ai-editor-blocks' ); ?>
				</button>
			</form>
		</div>
		<?php
	}
}
