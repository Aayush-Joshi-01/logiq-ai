import { create } from 'zustand'

// Session-only — not persisted. Freshly loaded per navigation.
export const useCourseStore = create((set) => ({
  courses:        {},   // keyed by course.id: { ...course, course_sections: [] }
  currentCourse:  null,

  setCourse: (id, course) =>
    set((s) => ({ courses: { ...s.courses, [id]: course } })),

  setCurrentCourse: (course) => set({ currentCourse: course }),

  updateSectionFlag: (courseId, sectionId, flags) =>
    set((s) => {
      const course = s.courses[courseId]
      if (!course) return {}
      return {
        courses: {
          ...s.courses,
          [courseId]: {
            ...course,
            course_sections: course.course_sections.map((sec) =>
              sec.id === sectionId ? { ...sec, ...flags } : sec
            ),
          },
        },
      }
    }),

  removeCourse: (courseId) =>
    set((s) => {
      const next = { ...s.courses }
      delete next[courseId]
      return { courses: next }
    }),

  clearCourses: () => set({ courses: {}, currentCourse: null }),
}))
