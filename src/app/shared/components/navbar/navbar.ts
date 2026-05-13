import { Component, inject, input, signal, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

export type NavRole = 'user' | 'manager' | 'admin';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  role     = input.required<NavRole>();
  private authSvc  = inject(AuthService);
  private elRef    = inject(ElementRef);

  dropdownOpen  = signal(false);
  dropdownTop   = signal(74);
  dropdownRight = signal(24);
  mobileMenuOpen = signal(false);
  profileOpen   = signal(false);
  saving        = signal(false);
  loadingProfile = signal(false);
  saveMsg       = signal('');
  saveError     = signal('');

  profileName           = '';
  profileEmail          = '';
  profileContact        = '';
  profileNewPassword    = '';
  profileConfirmPassword = '';
  showNewPassword    = signal(false);
  showConfirmPassword = signal(false);

  get userName() { return this.authSvc.currentUser()?.name ?? ''; }
  get userEmail() { return this.authSvc.currentUser()?.email ?? ''; }
  get initials() {
    return this.userName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  toggleDropdown() {
    const opening = !this.dropdownOpen();
    if (opening) {
      this.mobileMenuOpen.set(false);
      const btn = this.elRef.nativeElement.querySelector('.nav-user') as HTMLElement;
      if (btn) {
        const r = btn.getBoundingClientRect();
        this.dropdownTop.set(r.bottom + 8);
        this.dropdownRight.set(window.innerWidth - r.right);
      }
    }
    this.dropdownOpen.set(opening);
  }

  closeDropdownBackdrop() {
    this.dropdownOpen.set(false);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
    if (this.mobileMenuOpen()) {
      this.dropdownOpen.set(false);
    }
  }

  openProfile(e: MouseEvent) {
    e.stopPropagation();
    this.dropdownOpen.set(false);
    this.saveMsg.set('');
    this.saveError.set('');
    this.profileNewPassword    = '';
    this.profileConfirmPassword = '';
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
    const u = this.authSvc.currentUser();
    this.profileName    = u?.name ?? '';
    this.profileEmail   = u?.email ?? '';
    this.profileContact = '';
    this.loadingProfile.set(true);
    this.authSvc.getProfile().subscribe({
      next: (user: User) => {
        this.profileName    = user.name;
        this.profileEmail   = user.email;
        this.profileContact = user.contactNumber ?? '';
        this.loadingProfile.set(false);
      },
      error: () => this.loadingProfile.set(false)
    });
    this.profileOpen.set(true);
  }

  closeProfile() {
    this.profileOpen.set(false);
    this.saveMsg.set('');
    this.saveError.set('');
  }

  get passwordMismatch(): boolean {
    return !!(this.profileNewPassword && this.profileConfirmPassword &&
              this.profileNewPassword !== this.profileConfirmPassword);
  }

  saveProfile() {
    if (!this.profileName.trim()) return;
    const newPwd = this.profileNewPassword.trim();
    if (newPwd && newPwd !== this.profileConfirmPassword.trim()) {
      this.saveError.set('Passwords do not match.');
      return;
    }
    this.saving.set(true);
    this.saveMsg.set('');
    this.saveError.set('');
    const u = this.authSvc.currentUser();
    this.authSvc.updateProfile({
      name:          this.profileName.trim(),
      email:         this.profileEmail.trim(),
      contactNumber: this.profileContact.trim(),
      role:          u?.role ?? 'ROLE_GUEST',
      password:      newPwd
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.saveMsg.set(newPwd ? 'Profile and password updated successfully.' : 'Profile updated successfully.');
        this.profileNewPassword    = '';
        this.profileConfirmPassword = '';
        setTimeout(() => this.saveMsg.set(''), 3000);
      },
      error: (e: any) => {
        this.saving.set(false);
        this.saveError.set(e?.error?.message || 'Failed to update profile. Please try again.');
      }
    });
  }

  logout(e: MouseEvent) {
    e.stopPropagation();
    this.dropdownOpen.set(false);
    this.authSvc.logout();
  }
}
