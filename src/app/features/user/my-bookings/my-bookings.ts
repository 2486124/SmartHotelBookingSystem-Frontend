import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { StarRating } from '../../../shared/components/star-rating/star-rating';
import { BookingService } from '../../../core/services/booking.service';
import { ReviewService } from '../../../core/services/review.service';
import { HotelService } from '../../../core/services/hotel.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Booking } from '../../../core/models/booking.model';

interface BookingUI extends Booking {
  hotelName: string;
  hotelImageUrl: string;
  roomType: string;
  reviewText?: string;
  reviewRating?: number;
  reviewSubmitting?: boolean;
  reviewSubmitted?: boolean;
  reviewIgnoring?: boolean;
}

const CURRENT_PAGE_SIZE = 4;
const PREV_PAGE_SIZE    = 5;

@Component({
  selector: 'app-my-bookings',
  imports: [FormsModule, RouterLink, TitleCasePipe, DatePipe, Navbar, Footer, StarRating],
  templateUrl: './my-bookings.html',
  styleUrl: './my-bookings.css'
})
export class MyBookings implements OnInit {
  private bookingSvc = inject(BookingService);
  private reviewSvc  = inject(ReviewService);
  private hotelSvc   = inject(HotelService);
  private auth       = inject(AuthService);
  private toast      = inject(ToastService);

  current      = signal<BookingUI[]>([]);
  previous     = signal<BookingUI[]>([]);
  loading      = signal(true);
  cancellingId = signal<number | null>(null);
  error        = signal('');
  pendingCancel = signal<BookingUI | null>(null);

  // Pagination - Current bookings
  currentPage       = signal(1);
  currentTotalPages = signal(1);
  pagedCurrent      = signal<BookingUI[]>([]);

  // Pagination - Previous bookings
  prevPage       = signal(1);
  prevTotalPages = signal(1);
  pagedPrevious  = signal<BookingUI[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.bookingSvc.getMyBookings().subscribe({
      next: async (bookings) => {
        const enriched = await this.enrich(bookings);
        this.current.set(enriched.filter(b =>
          ['CONFIRMED', 'CHECKED_IN'].includes(b.status)
        ).reverse());
        this.previous.set(enriched.filter(b =>
          ['CHECKED_OUT', 'REVIEWED', 'NOT_REVIEWED', 'CANCELLED'].includes(b.status)
        ).reverse());
        this.currentPage.set(1);
        this.prevPage.set(1);
        this.paginateCurrent();
        this.paginatePrev();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private enrich(bookings: Booking[]): Promise<BookingUI[]> {
    if (!bookings.length) return Promise.resolve([]);

    const uniqueIds = [...new Set(bookings.map(b => b.hotelId))];
    const calls = uniqueIds.map(id =>
      this.hotelSvc.getHotelById(id).pipe(catchError(() => of(null)))
    );

    return new Promise(resolve => {
      forkJoin(calls).subscribe(hotels => {
        const map = new Map<number, { name: string; imageUrl: string }>();
        hotels.forEach((h, i) => {
          if (h) map.set(uniqueIds[i], { name: h.name, imageUrl: h.imageUrl || '' });
        });
        resolve(bookings.map(b => ({
          ...b,
          hotelName:    map.get(b.hotelId)?.name     || `Hotel #${b.hotelId}`,
          hotelImageUrl: map.get(b.hotelId)?.imageUrl || '',
          roomType:     `Room #${b.roomId}`,
          reviewRating: 4,
          reviewText:   ''
        })));
      });
    });
  }

  cancel(b: BookingUI) {
    this.pendingCancel.set(b);
  }

  confirmCancel() {
    const b = this.pendingCancel();
    if (!b) return;
    this.pendingCancel.set(null);
    this.cancellingId.set(b.bookingId);
    this.bookingSvc.cancelBooking(b.bookingId).subscribe({
      next: () => {
        this.cancellingId.set(null);
        this.toast.info('Booking cancelled. If a refund is applicable, it will be processed within 5–7 business days.');
        this.load();
      },
      error: () => { this.cancellingId.set(null); }
    });
  }

  submitReview(b: BookingUI) {
    const user = this.auth.currentUser();
    if (!user || !b.reviewText?.trim()) return;
    b.reviewSubmitting = true;
    this.previous.update(list => [...list]);
    this.reviewSvc.submitReview({
      userId:    user.id,
      hotelId:   b.hotelId,
      rating:    b.reviewRating ?? 4,
      comment:   b.reviewText,
      bookingId: b.bookingId
    }).subscribe({
      next: () => {
        b.reviewSubmitting = false;
        b.reviewSubmitted  = true;
        b.status           = 'REVIEWED';
        this.previous.update(list => [...list]);
        this.paginatePrev();
      },
      error: () => {
        b.reviewSubmitting = false;
        this.previous.update(list => [...list]);
        this.paginatePrev();
      }
    });
  }

  ignoreReview(b: BookingUI) {
    b.reviewIgnoring = true;
    this.previous.update(list => [...list]);
    this.bookingSvc.ignoreReview(b.bookingId).subscribe({
      next: () => {
        b.reviewIgnoring = false;
        b.status = 'NOT_REVIEWED';
        this.previous.update(list => [...list]);
        this.paginatePrev();
      },
      error: () => {
        b.reviewIgnoring = false;
        this.previous.update(list => [...list]);
        this.paginatePrev();
      }
    });
  }

  paginateCurrent() {
    const list = this.current();
    this.currentTotalPages.set(Math.ceil(list.length / CURRENT_PAGE_SIZE) || 1);
    const s = (this.currentPage() - 1) * CURRENT_PAGE_SIZE;
    this.pagedCurrent.set(list.slice(s, s + CURRENT_PAGE_SIZE));
  }

  paginatePrev() {
    const list = this.previous();
    this.prevTotalPages.set(Math.ceil(list.length / PREV_PAGE_SIZE) || 1);
    const s = (this.prevPage() - 1) * PREV_PAGE_SIZE;
    this.pagedPrevious.set(list.slice(s, s + PREV_PAGE_SIZE));
  }

  goCurrentPage(p: number) {
    if (p < 1 || p > this.currentTotalPages()) return;
    this.currentPage.set(p);
    this.paginateCurrent();
  }

  goPrevPage(p: number) {
    if (p < 1 || p > this.prevTotalPages()) return;
    this.prevPage.set(p);
    this.paginatePrev();
  }

  currentPageNums() { return Array.from({ length: this.currentTotalPages() }, (_, i) => i + 1); }
  prevPageNums()    { return Array.from({ length: this.prevTotalPages() },    (_, i) => i + 1); }

  setRating(b: BookingUI, r: number) { b.reviewRating = r; }

  formatId(id: number): string {
    return `HV-${String(id).padStart(5, '0')}`;
  }

  imgError(e: Event, size = '200x160') {
    (e.target as HTMLImageElement).src =
      `https://placehold.co/${size}/1a237e/fff?text=Hotel`;
  }
}
