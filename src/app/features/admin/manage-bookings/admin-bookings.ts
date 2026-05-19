import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { BookingService } from '../../../core/services/booking.service';
import { Booking } from '../../../core/models/booking.model';
import { ToastService } from '../../../shared/services/toast.service';
import { catchError, of } from 'rxjs';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-admin-bookings',
  imports: [FormsModule, DecimalPipe, DatePipe, Navbar, Footer],
  templateUrl: './admin-bookings.html',
  styleUrl: './admin-bookings.css'
})
export class AdminBookings implements OnInit {
  private bookingSvc = inject(BookingService);
  private toast      = inject(ToastService);

  allBookings    = signal<Booking[]>([]);
  displayed      = signal<Booking[]>([]);
  loading        = signal(true);
  search         = '';
  page           = signal(1);
  totalPages     = signal(1);
  pendingCancel  = signal<Booking | null>(null);
  cancelling     = signal(false);

  ngOnInit() {
    this.bookingSvc.getAllBookings()
      .pipe(catchError(() => of([])))
      .subscribe(bookings => {
        const reversed = [...bookings].reverse();
        this.allBookings.set(reversed);
        this.paginate(reversed);
        this.loading.set(false);
      });
  }

  onSearch() {
    const q = this.search.toLowerCase();
    const filtered = !q ? this.allBookings()
      : this.allBookings().filter(b =>
          String(b.bookingId).includes(q) ||
          b.userName?.toLowerCase().includes(q) ||
          b.hotelName?.toLowerCase().includes(q) ||
          b.roomType?.toLowerCase().includes(q));
    this.page.set(1);
    this.paginate(filtered);
  }

  paginate(list: Booking[]) {
    this.totalPages.set(Math.ceil(list.length / PAGE_SIZE) || 1);
    const s = (this.page() - 1) * PAGE_SIZE;
    this.displayed.set(list.slice(s, s + PAGE_SIZE));
  }

  goPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    const q = this.search.toLowerCase();
    const filtered = !q ? this.allBookings()
      : this.allBookings().filter(b =>
          String(b.bookingId).includes(q) ||
          b.userName?.toLowerCase().includes(q) ||
          b.hotelName?.toLowerCase().includes(q) ||
          b.roomType?.toLowerCase().includes(q));
    this.paginate(filtered);
  }

  pageNumbers() { return Array.from({ length: this.totalPages() }, (_, i) => i + 1); }

  confirmCancel(booking: Booking) { this.pendingCancel.set(booking); }
  dismissCancel()                 { this.pendingCancel.set(null); }

  executeCancel() {
    const booking = this.pendingCancel();
    if (!booking) return;
    this.cancelling.set(true);
    this.bookingSvc.cancelBooking(booking.bookingId).subscribe({
      next: () => {
        this.allBookings.update(list =>
          list.map(b => b.bookingId === booking.bookingId ? { ...b, status: 'CANCELLED' } : b));
        this.onSearch();
        this.pendingCancel.set(null);
        this.cancelling.set(false);
        this.toast.success(`Booking #${booking.bookingId} has been cancelled.`);
      },
      error: () => {
        this.cancelling.set(false);
        this.pendingCancel.set(null);
        this.toast.error('Failed to cancel booking. Please try again.');
      }
    });
  }

  canCancel(status: string): boolean {
    return status === 'CONFIRMED' || status === 'CHECKED_IN';
  }

  totalCount()     { return this.allBookings().length; }
  confirmedCount() { return this.allBookings().filter(b => b.status === 'CONFIRMED').length; }
  activeCount()    { return this.allBookings().filter(b => b.status === 'CHECKED_IN').length; }
  cancelledCount() { return this.allBookings().filter(b => b.status === 'CANCELLED').length; }
  pageEnd()        { return Math.min(this.page() * PAGE_SIZE, this.allBookings().length); }

  statusClass(status: string): string {
    return status.toLowerCase().replace(/_/g, '-');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      CONFIRMED: 'Confirmed',
      CHECKED_IN: 'Checked In',
      CHECKED_OUT: 'Checked Out',
      REVIEWED: 'Reviewed',
      NOT_REVIEWED: 'Not Reviewed',
      CANCELLED: 'Cancelled'
    };
    return map[status] ?? status;
  }

  fmtId(id: number): string {
    return 'HV-' + String(id).padStart(5, '0');
  }

  initials(name: string): string {
    return (name ?? '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
}
