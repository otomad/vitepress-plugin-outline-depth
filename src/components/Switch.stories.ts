import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Switch from "./Switch.vue";

const meta = {
	component: Switch,
	argTypes: {
		modelValue: { control: "boolean" },
	},
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
    args: {
        modelValue: false
    },

    render: args => ({
		components: { Switch },
		setup() {
			return { args };
		},
		template: '<Switch v-bind="args" />',
	})
};
