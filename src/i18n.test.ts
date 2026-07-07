import { describe, expect, it } from "vitest";
import enMessages from "../messages/en.json" with { type: "json" };
import ruMessages from "../messages/ru.json" with { type: "json" };

describe("i18n message catalogs", () => {
	const enKeys = Object.keys(enMessages).filter((k) => k !== "$schema");
	const ruKeys = Object.keys(ruMessages).filter((k) => k !== "$schema");

	it("ru has the same message keys as en", () => {
		const missingInRu = enKeys.filter((key) => !ruKeys.includes(key));
		const extraInRu = ruKeys.filter((key) => !enKeys.includes(key));
		expect(missingInRu, `Keys missing in ru.json: ${missingInRu.join(", ")}`).toEqual([]);
		expect(extraInRu, `Extra keys in ru.json: ${extraInRu.join(", ")}`).toEqual([]);
	});
});
