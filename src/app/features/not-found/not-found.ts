import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Footer } from '../../shared/components/footer/footer';
import { AuthService } from '../../core/services/auth.service';
import { NavRole } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-not-found',
  imports: [Navbar, Footer, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound {
  private authSvc = inject(AuthService);
  private router  = inject(Router);

  readonly isLoggedIn = computed(() => !!this.authSvc.currentUser());

  readonly navRole = computed<NavRole>(() => {
    const role = this.authSvc.currentUser()?.role;
    if (role === 'ROLE_ADMIN')         return 'admin';
    if (role === 'ROLE_HOTEL_MANAGER') return 'manager';
    return 'user';
  });

  readonly homeRoute = computed(() => {
    const role = this.authSvc.currentUser()?.role;
    if (role === 'ROLE_ADMIN')         return '/admin/dashboard';
    if (role === 'ROLE_HOTEL_MANAGER') return '/manager/dashboard';
    if (role === 'ROLE_GUEST')         return '/home';
    return '/';
  });
}
