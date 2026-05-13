import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Navbar } from '../../../shared/components/navbar/navbar';
import { Footer } from '../../../shared/components/footer/footer';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { RedemptionResponseDto } from '../../../core/models/loyalty.model';

const HIST_PAGE_SIZE = 8;

@Component({
  selector: 'app-rewards',
  imports: [RouterLink, DecimalPipe, DatePipe, Navbar, Footer],
  templateUrl: './rewards.html',
  styleUrl: './rewards.css'
})

export class Rewards implements OnInit {
  private loyaltySvc = inject(LoyaltyService);

  balance  = signal(0);
  history  = signal<RedemptionResponseDto[]>([]);
  loading  = signal(true);

  totalRedeemed = signal(0);
  totalSavings  = signal(0);

  histPage       = signal(1);
  histTotalPages = signal(1);
  pagedHistory   = signal<RedemptionResponseDto[]>([]);

  ngOnInit() {
    this.loyaltySvc.getBalance().subscribe(b => { this.balance.set(b); this.loading.set(false); });
    this.loyaltySvc.getHistory().subscribe(h => {
      this.history.set([...h].reverse());
      this.totalRedeemed.set(h.reduce((s, x) => s + (x.pointsUsed || 0), 0));
      this.totalSavings.set(h.reduce((s, x) => s + (x.discountApplied || 0), 0));
      this.histPage.set(1);
      this.paginateHist();
    });
  }

  paginateHist() {
    const list = this.history();
    this.histTotalPages.set(Math.ceil(list.length / HIST_PAGE_SIZE) || 1);
    const s = (this.histPage() - 1) * HIST_PAGE_SIZE;
    this.pagedHistory.set(list.slice(s, s + HIST_PAGE_SIZE));
  }

  goHistPage(p: number) {
    if (p < 1 || p > this.histTotalPages()) return;
    this.histPage.set(p);
    this.paginateHist();
  }

  histPageNums() { return Array.from({ length: this.histTotalPages() }, (_, i) => i + 1); }
}
