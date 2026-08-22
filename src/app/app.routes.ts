import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { SubmitAvailability } from './submit-availability/submit-availability';
import { SignUp } from './sign-up/sign-up';
import { Login } from './login/login';
import { MyMeetings } from './my-meetings/my-meetings';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', component: Dashboard, canActivate: [adminGuard] },
  { path: 'my-meetings', component: MyMeetings, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'submit-availability/:meetingId', component: SubmitAvailability, canActivate: [authGuard] }
];