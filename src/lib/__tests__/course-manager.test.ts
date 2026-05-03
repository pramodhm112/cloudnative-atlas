import { describe, it, expect } from 'vitest';
import { getCourseNavSequence, getPrevNext } from '../course-manager';
import type { CourseData } from '../course-manager';

const SLUG = 'docker-fundamentals';

function course(): CourseData {
  return {
    title: 'Docker Fundamentals',
    description: 'Learn Docker.',
    category: 'DevOps',
    difficulty: 'Beginner',
    tags: ['docker'],
    status: 'published',
    modules: [
      {
        slug: 'intro',
        title: 'Introduction',
        description: 'Basics.',
        order: 0,
        topics: [
          { slug: 'what', title: 'What is Docker?', studyGuide: '', order: 0 },
          { slug: 'arch', title: 'Architecture', studyGuide: '', order: 1 },
        ],
        questions: [
          { question: 'q1?', options: ['a', 'b'], correctIndex: 0 },
        ],
      },
      {
        slug: 'images',
        title: 'Images',
        description: 'Images.',
        order: 1,
        topics: [
          { slug: 'pull', title: 'Pull', studyGuide: '', order: 0 },
        ],
        // No questions — no quiz step expected for this module
      },
      {
        slug: 'volumes',
        title: 'Volumes',
        description: 'Volumes.',
        order: 2,
        topics: [
          { slug: 'mount', title: 'Mount', studyGuide: '', order: 0 },
        ],
        questions: [
          { question: 'q1?', options: ['a', 'b'], correctIndex: 1 },
          { question: 'q2?', options: ['a', 'b'], correctIndex: 0 },
        ],
      },
    ],
  };
}

describe('getCourseNavSequence', () => {
  it('produces topic → topic → quiz → topic → topic → quiz order', () => {
    const seq = getCourseNavSequence(SLUG, course());
    expect(seq.map((s) => s.url)).toEqual([
      `/courses/${SLUG}/intro/what`,
      `/courses/${SLUG}/intro/arch`,
      `/courses/${SLUG}/intro/quiz`,
      `/courses/${SLUG}/images/pull`,
      // images has no quiz — no quiz step here
      `/courses/${SLUG}/volumes/mount`,
      `/courses/${SLUG}/volumes/quiz`,
    ]);
  });

  it('skips modules with no questions for the quiz step', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const quizSteps = seq.filter((s) => s.type === 'quiz');
    expect(quizSteps.map((s) => s.moduleSlug)).toEqual(['intro', 'volumes']);
  });

  it('handles a module with empty questions array (treats as no quiz)', () => {
    const c = course();
    c.modules[0].questions = [];
    const seq = getCourseNavSequence(SLUG, c);
    const quizSteps = seq.filter((s) => s.type === 'quiz');
    expect(quizSteps.map((s) => s.moduleSlug)).toEqual(['volumes']);
  });

  it('quiz step title and module metadata are correct', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const introQuiz = seq.find((s) => s.type === 'quiz' && s.moduleSlug === 'intro');
    expect(introQuiz).toBeDefined();
    expect(introQuiz!.title).toBe('Introduction Quiz');
    expect(introQuiz!.moduleTitle).toBe('Introduction');
  });

  it('returns an empty sequence for a course with no modules', () => {
    const c = course();
    c.modules = [];
    expect(getCourseNavSequence(SLUG, c)).toEqual([]);
  });
});

describe('getPrevNext', () => {
  it('returns nulls for an unknown URL', () => {
    const seq = getCourseNavSequence(SLUG, course());
    expect(getPrevNext(seq, '/courses/unknown/path')).toEqual({ prev: null, next: null });
  });

  it('first step has no prev', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const { prev, next } = getPrevNext(seq, `/courses/${SLUG}/intro/what`);
    expect(prev).toBeNull();
    expect(next?.url).toBe(`/courses/${SLUG}/intro/arch`);
  });

  it('last step has no next', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const { prev, next } = getPrevNext(seq, `/courses/${SLUG}/volumes/quiz`);
    expect(prev?.url).toBe(`/courses/${SLUG}/volumes/mount`);
    expect(next).toBeNull();
  });

  it('last topic of a module routes Next to that module quiz', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const { next } = getPrevNext(seq, `/courses/${SLUG}/intro/arch`);
    expect(next?.type).toBe('quiz');
    expect(next?.url).toBe(`/courses/${SLUG}/intro/quiz`);
  });

  it('quiz routes Next to the first topic of the next module', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const { next } = getPrevNext(seq, `/courses/${SLUG}/intro/quiz`);
    expect(next?.type).toBe('topic');
    expect(next?.url).toBe(`/courses/${SLUG}/images/pull`);
  });

  it('module with no quiz routes Next directly to next module first topic', () => {
    const seq = getCourseNavSequence(SLUG, course());
    const { next } = getPrevNext(seq, `/courses/${SLUG}/images/pull`);
    expect(next?.url).toBe(`/courses/${SLUG}/volumes/mount`);
  });
});
