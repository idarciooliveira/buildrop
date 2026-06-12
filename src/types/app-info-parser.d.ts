declare module "app-info-parser" {
	export default class AppInfoParser {
		constructor(file: string | { name: string });
		parse(): Promise<unknown>;
	}
}
