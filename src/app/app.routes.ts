import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { SubmitAvailability } from './submit-availability/submit-availability';
import { SignUp } from './sign-up/sign-up';
import { Login } from './login/login';
import { MyMeetings } from './my-meetings/my-meetings';
import { ForgotPassword } from './forgot-password/forgot-password';
import { authGuard } from './guards/auth-guard';
import { adminGuard } from './guards/admin-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'admin/home', pathMatch: 'full' },
  { path: 'home', redirectTo: 'admin/home', pathMatch: 'full' },
  { path: 'meetings', redirectTo: 'admin/meetings', pathMatch: 'full' },
  { path: 'create-meeting', redirectTo: 'admin/create', pathMatch: 'full' },
  { path: 'participants', redirectTo: 'admin/participants', pathMatch: 'full' },
  { path: 'availability', redirectTo: 'admin/availability', pathMatch: 'full' },
  { path: 'find-best-slot', redirectTo: 'admin/slot', pathMatch: 'full' },
  { path: 'admin/:view', component: Dashboard, canActivate: [adminGuard] },
  { path: 'my-meetings', component: MyMeetings, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'sign-up', component: SignUp },
  { path: 'forgot-password', component: ForgotPassword },
  { path: 'submit-availability/:meetingId', component: SubmitAvailability, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
