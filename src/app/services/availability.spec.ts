import { TestBed } from '@angular/core/testing';

import { Availability } from './availability';

describe('Availability', () => {
  let service: Availability;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Availability);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
