import { describe, expect, it } from "vitest";
import { COMPONENT_GROUP, GROUPS, focusComponent, groupMembers } from "../src/preset/groups";

const NAMES = Object.keys(COMPONENT_GROUP);

/** "button", "card", "badge" and "input" are BOTH a group id and a component name.
 *  A bare-string selection cannot tell the two apart, which made the dashboard render
 *  the whole group grid when a single component was clicked. */
const COLLIDING = GROUPS.map((g) => g.id).filter((id) => id in COMPONENT_GROUP);

describe("selection resolution", () => {
	it("still has the name collisions this type exists to disambiguate", () => {
		expect(COLLIDING.toSorted()).toEqual(["badge", "button", "card", "input"]);
	});

	it("focuses the component itself when a colliding name is selected as a component", () => {
		for (const name of COLLIDING) {
			expect(focusComponent({ kind: "component", name }, NAMES)).toBe(name);
		}
	});

	it("focuses the first member when the same name is selected as a group", () => {
		expect(focusComponent({ kind: "group", id: "badge" }, NAMES)).toBe("avatar");
		expect(focusComponent({ kind: "group", id: "input" }, NAMES)).toBe("calendar");
	});

	it("focuses nothing in the tokens view", () => {
		expect(focusComponent({ kind: "tokens" }, NAMES)).toBe("");
	});

	it("lists a colliding component under its own group exactly once", () => {
		expect(groupMembers("badge", NAMES)).toEqual(["avatar", "badge"]);
		expect(groupMembers("card", NAMES)).toEqual(["card"]);
	});

	it("assigns every component to a declared group", () => {
		for (const name of NAMES) {
			expect(GROUPS.some((g) => g.id === COMPONENT_GROUP[name])).toBe(true);
		}
	});
});
