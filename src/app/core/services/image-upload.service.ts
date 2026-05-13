import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpBackend } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageUploadService {
  // HttpBackend bypasses ALL Angular interceptors (including the JWT auth interceptor)
  // so ImageKit receives our Basic auth header untouched
  private http      = new HttpClient(inject(HttpBackend));
  private uploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';

  private get authHeader(): HttpHeaders {
    const encoded = btoa(environment.imageKit.privateKey + ':');
    return new HttpHeaders({ Authorization: 'Basic ' + encoded });
  }

  upload(file: File, folder: string): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', `${Date.now()}_${file.name}`);
    formData.append('folder', folder);

    return this.http
      .post<{ url: string }>(this.uploadUrl, formData, { headers: this.authHeader })
      .pipe(map(res => res.url));
  }
}
