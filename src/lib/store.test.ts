import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Meal, Profile, SquadMember } from "./types";

// Mock idb-keyval before importing store
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock crypto.randomUUID with incrementing IDs
let uuidCounter = 0;
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  },
});

import { useStore } from "./store";

function profileFixture(patch: Partial<Profile> = {}): Profile {
  return {
    sex: "male",
    birthdate: "1990-01-01",
    height_cm: 180,
    current_weight_kg: 80,
    activity_factor: 1.55,
    calorie_goal: 2000,
    protein_goal: 150,
    fat_goal: 70,
    carb_goal: 200,
    createdAt: "2024-01-01",
    ...patch,
  };
}

function mealFixture(patch: Partial<Meal> = {}): Meal {
  return {
    id: "meal-1",
    type: "breakfast",
    loggedAt: new Date().toISOString(),
    total_kcal: 500,
    p: 30,
    f: 20,
    c: 50,
    items: [],
    ...patch,
  };
}

function memberFixture(name: string): Omit<SquadMember, "id"> {
  return {
    name,
    color: "#dc0000",
    calorie_goal: 2000,
    kcal_in: 0,
    kcal_out: 0,
    streak: 0,
  };
}

describe("useStore", () => {
  beforeEach(() => {
    // Reset UUID counter
    uuidCounter = 0;
    // Reset store to initial state
    useStore.setState({
      hydrated: false,
      profile: null,
      meals: [],
      exerciseLogs: [],
      weightLogs: [],
      recipes: [],
      customFoods: [],
      streaks: { current_streak: 0, longest_streak: 0, last_logged_date: null },
      waterToday: 0,
      sleepToday: 0,
      notesToday: "",
      aiTokenCount: 0,
      squad: null,
    });
  });

  describe("setProfile", () => {
    it("should set profile", () => {
      const profile = {
        sex: "male" as const,
        birthdate: "1990-01-01",
        height_cm: 180,
        current_weight_kg: 80,
        activity_factor: 1.55 as const,
        calorie_goal: 2000,
        protein_goal: 150,
        fat_goal: 70,
        carb_goal: 200,
        createdAt: "2024-01-01",
      };

      useStore.getState().setProfile(profile);
      expect(useStore.getState().profile).toEqual(profile);
    });
  });

  describe("updateProfile", () => {
    it("should update profile fields", () => {
      const profile = {
        sex: "male" as const,
        birthdate: "1990-01-01",
        height_cm: 180,
        current_weight_kg: 80,
        activity_factor: 1.55 as const,
        calorie_goal: 2000,
        protein_goal: 150,
        fat_goal: 70,
        carb_goal: 200,
        createdAt: "2024-01-01",
      };

      useStore.getState().setProfile(profile);
      useStore.getState().updateProfile({ calorie_goal: 2500 });

      expect(useStore.getState().profile?.calorie_goal).toBe(2500);
      expect(useStore.getState().profile?.height_cm).toBe(180);
    });

    it("should not update when profile is null", () => {
      useStore.getState().updateProfile({ calorie_goal: 2500 });
      expect(useStore.getState().profile).toBeNull();
    });
  });

  describe("addMeal", () => {
    it("should add meal to list", () => {
      const meal = mealFixture();

      useStore.getState().addMeal(meal);
      expect(useStore.getState().meals).toHaveLength(1);
      expect(useStore.getState().meals[0]).toEqual(meal);
    });
  });

  describe("deleteMeal", () => {
    it("should remove meal by id", () => {
      const meal1 = mealFixture({ id: "meal-1", type: "breakfast" });
      const meal2 = mealFixture({ id: "meal-2", type: "lunch" });

      useStore.setState({ meals: [meal1, meal2] });
      useStore.getState().deleteMeal("meal-1");

      expect(useStore.getState().meals).toHaveLength(1);
      expect(useStore.getState().meals[0].id).toBe("meal-2");
    });
  });

  describe("bumpAiTokens", () => {
    it("should increment token count", () => {
      useStore.getState().bumpAiTokens(100);
      expect(useStore.getState().aiTokenCount).toBe(100);

      useStore.getState().bumpAiTokens(50);
      expect(useStore.getState().aiTokenCount).toBe(150);
    });
  });

  describe("setWater", () => {
    it("should set water amount", () => {
      useStore.getState().setWater(2000);
      expect(useStore.getState().waterToday).toBe(2000);
    });
  });

  describe("setSleep", () => {
    it("should set sleep hours", () => {
      useStore.getState().setSleep(8);
      expect(useStore.getState().sleepToday).toBe(8);
    });
  });

  describe("setNotes", () => {
    it("should set notes", () => {
      useStore.getState().setNotes("Feeling good today");
      expect(useStore.getState().notesToday).toBe("Feeling good today");
    });
  });

  describe("createSquad", () => {
    it("should create squad with name", () => {
      useStore.getState().createSquad("Team Alpha");

      const squad = useStore.getState().squad;
      expect(squad).not.toBeNull();
      expect(squad?.name).toBe("Team Alpha");
      expect(squad?.id).toBe("test-uuid-1");
      expect(squad?.members).toEqual([]);
    });
  });

  describe("addSquadMember", () => {
    it("should add member to squad", () => {
      useStore.getState().createSquad("Team Alpha");

      const member = memberFixture("John");
      useStore.getState().addSquadMember(member);

      expect(useStore.getState().squad?.members).toHaveLength(1);
      expect(useStore.getState().squad?.members[0].name).toBe("John");
      expect(useStore.getState().squad?.members[0].id).toBe("test-uuid-2");
    });

    it("should not add more than 6 members", () => {
      useStore.getState().createSquad("Team Alpha");

      for (let i = 0; i < 6; i++) {
        useStore.getState().addSquadMember(memberFixture(`Member ${i}`));
      }

      useStore.getState().addSquadMember(memberFixture("Extra"));
      expect(useStore.getState().squad?.members).toHaveLength(6);
    });

    it("should not add when squad is null", () => {
      useStore.getState().addSquadMember(memberFixture("John"));
      expect(useStore.getState().squad).toBeNull();
    });
  });

  describe("removeSquadMember", () => {
    it("should remove member by id", () => {
      useStore.getState().createSquad("Team Alpha");
      useStore.getState().addSquadMember(memberFixture("John"));
      useStore.getState().addSquadMember(memberFixture("Jane"));

      const memberId = useStore.getState().squad?.members[0].id;
      useStore.getState().removeSquadMember(memberId!);

      expect(useStore.getState().squad?.members).toHaveLength(1);
      expect(useStore.getState().squad?.members[0].name).toBe("Jane");
    });
  });

  describe("leaveSquad", () => {
    it("should clear squad", () => {
      useStore.getState().createSquad("Team Alpha");
      expect(useStore.getState().squad).not.toBeNull();

      useStore.getState().leaveSquad();
      expect(useStore.getState().squad).toBeNull();
    });
  });

  describe("resetAll", () => {
    it("should reset all state to defaults", () => {
      // Set some data
      useStore.getState().setProfile(profileFixture());
      useStore.getState().addMeal(mealFixture({ id: "m1" }));
      useStore.getState().setWater(1500);
      useStore.getState().createSquad("Team");

      useStore.getState().resetAll();

      const state = useStore.getState();
      expect(state.profile).toBeNull();
      expect(state.meals).toEqual([]);
      expect(state.waterToday).toBe(0);
      expect(state.squad).toBeNull();
      expect(state.streaks.current_streak).toBe(0);
    });
  });
});
