import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";

describe("App", () => {
  it("renders brand name and sign-in button", () => {
    const wrapper = mount(App);
    expect(wrapper.text()).toContain("Kennel");
    expect(wrapper.text()).toContain("The AI build platform for dog businesses.");
    expect(wrapper.find("button").text()).toBe("Sign in");
  });

  it("applies both brand colors in the template", () => {
    const wrapper = mount(App);
    const html = wrapper.html();
    expect(html).toContain("bg-kennel-navy");
    expect(html).toContain("bg-kennel-sun");
  });
});
