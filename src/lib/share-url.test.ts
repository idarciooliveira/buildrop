import { describe, expect, it } from "vitest";

import { buildAppShareUrl } from "./share-url";

describe("buildAppShareUrl", () => {
	it("builds the public build link for a file id", () => {
		expect(buildAppShareUrl("https://buildrop.example", "abc123")).toBe(
			"https://buildrop.example/d/abc123",
		);
	});

	it("normalizes origins with a trailing slash", () => {
		expect(buildAppShareUrl("https://buildrop.example/", "abc123")).toBe(
			"https://buildrop.example/d/abc123",
		);
	});
});
