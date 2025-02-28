import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AccountService } from 'src/app/_services/account.service';

@Component({
  selector: 'app-confirm-reset-password',
  templateUrl: './confirm-reset-password.component.html',
  styleUrls: ['./confirm-reset-password.component.scss']
})
export class ConfirmResetPasswordComponent implements OnInit {

  token: string = '';
  registerForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.maxLength(32), Validators.minLength(6)]),
  });

  constructor(private route: ActivatedRoute, private router: Router, private accountService: AccountService, private toastr: ToastrService) {
    const token = this.route.snapshot.queryParamMap.get('token');
    const email = this.route.snapshot.queryParamMap.get('email');
    if (token == undefined || token === '' || token === null) {
      // This is not a valid url, redirect to login
      this.toastr.error('Invalid reset password url');
      this.router.navigateByUrl('login');
      return;
    }

    this.token = token;
    this.registerForm.get('email')?.setValue(email);
    
  }

  ngOnInit(): void {
  }

  submit() {
    const model = this.registerForm.getRawValue();
    model.token = this.token;
    this.accountService.confirmResetPasswordEmail(model).subscribe(() => {
      this.toastr.success("Password reset");
      this.router.navigateByUrl('login');
    }, err => {
      console.log(err);
    });
  }


}
