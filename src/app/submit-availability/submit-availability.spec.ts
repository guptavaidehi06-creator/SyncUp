import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../services/auth';

import { SubmitAvailability } from './submit-availability';

describe('SubmitAvailability', () => {
  let component: SubmitAvailability;
  let fixture: ComponentFixture<SubmitAvailability>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitAvailability],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getUser: () => null } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SubmitAvailability);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
