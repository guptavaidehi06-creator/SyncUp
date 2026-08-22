import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitAvailability } from './submit-availability';

describe('SubmitAvailability', () => {
  let component: SubmitAvailability;
  let fixture: ComponentFixture<SubmitAvailability>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitAvailability],
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitAvailability);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
