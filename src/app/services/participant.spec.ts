import { TestBed } from '@angular/core/testing';

import { Participant } from './participant';

describe('Participant', () => {
  let service: Participant;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Participant);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
