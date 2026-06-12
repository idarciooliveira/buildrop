import { describe, expect, it } from "vitest";

import {
	canReserveStorage,
	DEFAULT_STORAGE_LIMIT_BYTES,
} from "./storage-quota-utils";

describe("canReserveStorage", () => {
	it("uses the default one GiB limit", () => {
		expect(DEFAULT_STORAGE_LIMIT_BYTES).toBe(1024 * 1024 * 1024);
	});

	it("allows a reservation that exactly reaches the limit", () => {
		expect(
			canReserveStorage({
				fileSizeBytes: 25,
				limitBytes: 100,
				reservedBytes: 25,
				usedBytes: 50,
			}),
		).toBe(true);
	});

	it("rejects a reservation that exceeds the limit", () => {
		expect(
			canReserveStorage({
				fileSizeBytes: 26,
				limitBytes: 100,
				reservedBytes: 25,
				usedBytes: 50,
			}),
		).toBe(false);
	});
});
