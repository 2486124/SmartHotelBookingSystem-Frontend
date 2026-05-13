import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { catchError, of } from 'rxjs';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { HotelService } from '../../../core/services/hotel.service';
import { ImageUploadService } from '../../../core/services/image-upload.service';
import { BookingService } from '../../../core/services/booking.service';
import { ReviewService } from '../../../core/services/review.service';
import { ToastService } from '../../../shared/services/toast.service';
import { HotelResponse } from '../../../core/models/hotel.model';

@Component({
  selector: 'app-manager-dashboard',
  imports: [FormsModule, DecimalPipe, Navbar, Footer],
  templateUrl: './manager-dashboard.html',
  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboard implements OnInit {
  private hotelSvc     = inject(HotelService);
  private bookingSvc   = inject(BookingService);
  private reviewSvc    = inject(ReviewService);
  private toast        = inject(ToastService);
  private imageUpload  = inject(ImageUploadService);

  hotel          = signal<HotelResponse | null>(null);
  bookingsCount  = signal(0);
  pendingReviews = signal(0);
  totalRooms     = signal(0);
  rating         = signal(0);
  amenityList    = signal<string[]>([]);
  loading        = signal(true);

  // Hotel registration state
  noHotel      = signal(false);
  showRegister = signal(false);
  registering  = signal(false);

  // Registration form — plain properties (not signals, ngModel compatible)
  regName      = '';
  regLocation  = '';
  regImageUrl  = '';
  regAmenities = '';

  // Edit hotel details state
  showEditHotel = signal(false);
  savingEdit    = signal(false);

  // Delete hotel state
  showDeleteConfirm = signal(false);
  deleting          = signal(false);
  editName      = '';
  editLocation  = '';
  editImageUrl  = '';

  // Image upload state
  uploadingRegImg  = signal(false);
  uploadingEditImg = signal(false);
  regImgUploaded   = signal(false);
  editImgUploaded  = signal(false);

  // Amenity input — plain property
  newAmenity = '';

  ngOnInit() {
    this.hotelSvc.getMyHotel().subscribe({
      next: (h) => {
        this.hotel.set(h);
        this.rating.set(h.rating);
        this.amenityList.set((h.amenities || '').split(',').map(a => a.trim()).filter(Boolean));
        this.loading.set(false);
        this.loadKpis(h);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 404) {
          this.noHotel.set(true);
          this.showRegister.set(true);
        }
      }
    });
  }

  private loadKpis(h: HotelResponse) {
    this.bookingSvc.getBookingsForHotel(h.hotelId)
      .pipe(catchError(() => of([])))
      .subscribe(b => this.bookingsCount.set(b.length));
    this.hotelSvc.getRoomsForHotel(h.hotelId)
      .pipe(catchError(() => of([])))
      .subscribe(r => this.totalRooms.set(r.length));
    this.reviewSvc.getHotelReviews(h.hotelId)
      .pipe(catchError(() => of([])))
      .subscribe(r => this.pendingReviews.set(r.filter(rev => !rev.managerResponse).length));
  }

  openRegister() {
    this.regName = '';
    this.regLocation = '';
    this.regImageUrl = '';
    this.regAmenities = '';
    this.regImgUploaded.set(false);
    this.showRegister.set(true);
  }

  registerHotel() {
    if (!this.regName.trim() || !this.regLocation.trim()) return;
    this.registering.set(true);
    this.hotelSvc.createHotel({
      name:      this.regName.trim(),
      location:  this.regLocation.trim(),
      imageUrl:  this.regImageUrl.trim(),
      amenities: this.regAmenities.trim()
    }).subscribe({
      next: (h) => {
        this.hotel.set(h);
        this.rating.set(h.rating);
        this.amenityList.set((h.amenities || '').split(',').map(a => a.trim()).filter(Boolean));
        this.noHotel.set(false);
        this.showRegister.set(false);
        this.registering.set(false);
        this.loadKpis(h);
      },
      error: () => this.registering.set(false)
    });
  }

  openEditHotel() {
    const h = this.hotel();
    if (!h) return;
    this.editName     = h.name;
    this.editLocation = h.location;
    this.editImageUrl = h.imageUrl || '';
    this.editImgUploaded.set(false);
    this.showEditHotel.set(true);
  }

  onRegImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingRegImg.set(true);
    this.regImgUploaded.set(false);
    this.imageUpload.upload(file, '/hotels').subscribe({
      next: (url) => { this.regImageUrl = url; this.uploadingRegImg.set(false); this.regImgUploaded.set(true); },
      error: () => { this.uploadingRegImg.set(false); this.toast.error('Image upload failed.'); }
    });
  }

  onEditImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingEditImg.set(true);
    this.editImgUploaded.set(false);
    this.imageUpload.upload(file, '/hotels').subscribe({
      next: (url) => { this.editImageUrl = url; this.uploadingEditImg.set(false); this.editImgUploaded.set(true); },
      error: () => { this.uploadingEditImg.set(false); this.toast.error('Image upload failed.'); }
    });
  }

  saveHotelDetails() {
    const h = this.hotel();
    if (!h || !this.editName.trim() || !this.editLocation.trim()) return;
    this.savingEdit.set(true);
    const payload = {
      name:      this.editName.trim(),
      location:  this.editLocation.trim(),
      imageUrl:  this.editImageUrl.trim(),
      amenities: this.amenityList().join(', ')   // preserve current amenities
    };
    this.hotelSvc.updateHotel(h.hotelId, payload).subscribe({
      next: (updated) => {
        this.hotel.set(updated);
        this.savingEdit.set(false);
        this.showEditHotel.set(false);
        this.toast.success('Hotel details updated successfully.');
      },
      error: () => {
        this.savingEdit.set(false);
        this.toast.error('Failed to update hotel details. Please try again.');
      }
    });
  }

  addAmenity() {
    const a = this.newAmenity.trim();
    if (!a || this.amenityList().includes(a)) return;
    this.amenityList.update(list => [...list, a]);
    this.newAmenity = '';
    this.saveAmenities();
  }

  removeAmenity(a: string) {
    this.amenityList.update(list => list.filter(x => x !== a));
    this.saveAmenities();
  }

  saveAmenities() {
    const h = this.hotel();
    if (!h) return;
    const updated = { name: h.name, location: h.location, imageUrl: h.imageUrl, amenities: this.amenityList().join(', ') };
    this.hotelSvc.updateHotel(h.hotelId, updated).subscribe({
      next: () => this.toast.success('Amenities saved.'),
      error: () => this.toast.error('Failed to save amenities. Please try again.')
    });
  }

  deleteHotel() {
    this.deleting.set(true);
    this.hotelSvc.deleteMyHotel().subscribe({
      next: () => {
        this.hotel.set(null);
        this.deleting.set(false);
        this.showDeleteConfirm.set(false);
        this.noHotel.set(true);
        this.showRegister.set(false);
        this.bookingsCount.set(0);
        this.totalRooms.set(0);
        this.pendingReviews.set(0);
        this.rating.set(0);
        this.amenityList.set([]);
        this.toast.success('Hotel deleted successfully.');
      },
      error: () => {
        this.deleting.set(false);
        this.toast.error('Failed to delete hotel. Please try again.');
      }
    });
  }

  amenityIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('pool'))    return '🏊';
    if (n.includes('spa') || n.includes('wellness')) return '🧖';
    if (n.includes('gym'))     return '🏋️';
    if (n.includes('lounge') || n.includes('sky')) return '🍸';
    if (n.includes('dining') || n.includes('restaurant') || n.includes('gourmet')) return '🍽️';
    if (n.includes('business')) return '💼';
    if (n.includes('parking') || n.includes('valet')) return '🅿️';
    if (n.includes('wifi'))    return '📶';
    return '✨';
  }
}
