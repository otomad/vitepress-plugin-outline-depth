export interface OutlineDepthPluginOptions {
	/**
	 * Set the default value for options.
	 */
	default?: {
		/**
		 * Specify the default value of Outline Depth.
		 * @default 2
		 */
		depth?: 2 | 3 | 4 | 5 | 6;
		/**
		 * Specify the default value of Auto Expand.
		 * @default true
		 */
		autoExpand?: boolean;
	};
	/**
	 * Localize the labels.
	 */
	locales?: Record<
		string,
		{
			/**
			 * Specify the localized label text of Outline Depth.
			 * @default
			 * ```markdown
			 * - en: Outline depth
			 * - zh: 目录层级
			 * ```
			 */
			depth: string;
			/**
			 * Specify the localized label text of Auto Expand.
			 * @default
			 * ```markdown
			 * - en: Auto expand
			 * - zh: 自动展开
			 * ```
			 */
			autoExpand: string;
		}
	>;
	/**
	 * Save the config to local storage.
	 * @default true
	 */
	saveToLocalStorage?: boolean;
}
