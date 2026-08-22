import { TestBed } from '@angular/core/testing';

import { Scheduling } from './scheduling';

describe('Scheduling', () => {
  let service: Scheduling;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Scheduling);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
