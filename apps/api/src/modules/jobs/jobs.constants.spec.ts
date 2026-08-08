import { CLIP_QUEUE, JobType } from './jobs.constants';

describe('jobs.constants', () => {
  it('exposes the clip processing queue name', () => {
    expect(CLIP_QUEUE).toBe('clip_processing');
  });

  it('defines the expected job type enum values', () => {
    expect(JobType.GENERATE_CLIPS).toBe('generate_clips');
    expect(JobType.EXPORT_CLIP).toBe('export_clip');
    expect(JobType.ANALYZE_VIDEO).toBe('analyze_video');
    expect(JobType.URL_PIPELINE).toBe('url_pipeline');
    expect(JobType.PUBLISH_CLIP).toBe('publish_clip');
  });

  it('has exactly 5 job types', () => {
    expect(Object.keys(JobType)).toHaveLength(5);
  });
});
