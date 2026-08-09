import type { Meta, StoryObj } from "@storybook/vue3-vite";

import Slider from "./Slider.vue";

const meta = {
	component: Slider,
	argTypes: {
		modelValue: { control: "number", description: "Value", table: { category: "models" } },
		min: { description: "Minimum value" },
		max: { description: "Maximum value" },
		step: {
			control: { type: "number", min: 1 },
			description: "Step",
			table: { defaultValue: { summary: "undefined" } },
		},
	},
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Primary: Story = {
	render: args => ({
		components: { Slider },
		setup() {
			return { args };
		},
		template: '<Slider v-bind="args" />',
	}),
	args: {
		min: 0,
		max: 100,
		step: undefined,
		modelValue: 0,
	},
};
