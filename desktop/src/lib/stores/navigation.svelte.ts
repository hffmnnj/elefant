type View = "chat" | "settings" | "models" | "about";

let currentView = $state<View>("chat");

export const navigationStore = {
	get current() {
		return currentView;
	},
	navigate(view: View): void {
		currentView = view;
	},
	isActive(view: View): boolean {
		return currentView === view;
	},
};
