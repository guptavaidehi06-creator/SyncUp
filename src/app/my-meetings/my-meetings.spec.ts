import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyMeetings } from './my-meetings';

describe('MyMeetings', () => {
  let component: MyMeetings;
  let fixture: ComponentFixture<MyMeetings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyMeetings],
    }).compileComponents();

    fixture = TestBed.createComponent(MyMeetings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
