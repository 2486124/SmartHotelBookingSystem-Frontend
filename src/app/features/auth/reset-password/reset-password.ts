import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

function passwordsMatch(ctrl: AbstractControl): ValidationErrors | null {
  const pwd     = ctrl.get('newPassword')?.value;
  const confirm = ctrl.get('confirmPassword')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css'
})
export class ResetPassword implements OnInit {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  token      = signal('');
  loading    = signal(false);
  success    = signal(false);
  tokenError = signal(false);

  showNew     = signal(false);
  showConfirm = signal(false);

  form = this.fb.group({
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordsMatch });

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token');
    if (!t) { this.tokenError.set(true); return; }
    this.token.set(t);
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.resetPassword(this.token(), this.form.value.newPassword!).subscribe({
      next: () => { this.loading.set(false); this.success.set(true); },
      error: () => { this.loading.set(false); this.tokenError.set(true); }
    });
  }

  get newCtrl()     { return this.form.controls.newPassword; }
  get confirmCtrl() { return this.form.controls.confirmPassword; }
  get mismatch()    { return this.form.hasError('mismatch') && this.confirmCtrl.touched; }
}
