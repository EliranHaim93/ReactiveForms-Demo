import { Component, OnInit } from '@angular/core';
import {
  FormGroup,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidatorFn,
  FormArray,
} from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { Customer } from './customer';

//costume validator function example (if it is used in this component only use here if not, create it in its oun file)
//hard coded number range e.g
// function ratingRange(c: AbstractControl): { [key: string]: boolean } | null {
//   if (c.value !== null && (isNaN(c.value) || c.value < 1 || c.value > 5)) {
//     return { range: true };
//   }
//   return null;
// }

//provided parameters like range e.g > using function factory :VlidatorFn
function ratingRange(min: number, max: number): ValidatorFn {
  return (c: AbstractControl): { [key: string]: boolean } | null => {
    if (
      c.value !== null &&
      (isNaN(c.value) || c.value < min || c.value > max)
    ) {
      return { range: true };
    }
    return null;
  };
}

//cross-field validation function e.g (used to validate a comparison between 2 or more input values )
function emailMatcher(c: AbstractControl): { [key: string]: boolean } | null {
  const emailControl = c.get('email');
  const confirmControl = c.get('confirmEmail');

  if (emailControl?.pristine || confirmControl?.pristine) {
    return null;
  }

  if (emailControl?.value === confirmControl?.value) {
    return null;
  }
  return { match: true };
}

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.css'],
})
export class CustomerComponent implements OnInit {
  customerForm!: FormGroup;
  customer = new Customer();
  emailMessage!: string;

  //building a FormArray and binding to a property using getter, to insure the code doesent accedentaly modify the FormArray
  get addresses(): FormArray {
    return <FormArray>this.customerForm.get('addresses');
  }

  //moving the validator messages from html to code
  private validationMessages: any = {
    required: 'Please enter your email address.',
    email: 'Please enter a valid email address.',
  };

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    //original pre fb way to creating building blocks
    // this.customerForm = new FormGroup({
    //   firstName: new FormControl(),
    //   lastName: new FormControl(),
    //   email: new FormControl(),
    //   sendCatalog: new FormControl(true),
    // });

    //using formBuilder
    this.customerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(3)]],
      // lastName: { value: 'n/a', disabled: true }, // e.g to alternative way of value
      lastName: ['', [Validators.required, Validators.maxLength(50)]],
      //nested formGroup
      emailGroup: this.fb.group(
        {
          email: ['', [Validators.required, Validators.email]],
          confirmEmail: ['', Validators.required],
        },
        { validators: emailMatcher }
      ),
      phone: '',
      notification: 'email',
      rating: [null, ratingRange(1, 5)],
      sendCatalog: true,
      //calling a method that creates a form group every time its called
      addresses: this.fb.array([this.buildAddress()]),
    });

    //e.g of watching for changes on input / control values
    //must be written after the creation of the building blocks, otherwise = null
    //also used to call a callback function on changes instead of listening from the HTML
    this.customerForm
      .get('notification')
      ?.valueChanges.subscribe((value) => this.setNotification(value));

    const emailControl = this.customerForm.get('emailGroup.email');
    emailControl?.valueChanges
      .pipe(debounceTime(1000))
      .subscribe((value) => this.setMessage(emailControl));
  }

  //method that will be called each time a user requests a copy of the addresses form group by clicking a button
  addAddress(): void {
    this.addresses.push(this.buildAddress());
  }

  //creating a method to be called in purpose to duplicate the same FG
  buildAddress(): FormGroup {
    return this.fb.group({
      addressType: 'home',
      street1: ['', Validators.required],
      street2: '',
      city: '',
      state: ['', Validators.required],
      zip: '',
    });
  }

  save(): void {
    console.log(this.customerForm);
    console.log('Saved: ' + JSON.stringify(this.customerForm.value));
  }

  //setValue > sets default value to all controls in the formGroup
  // populateTestData(): void {
  //   this.customerForm.setValue({
  //     firstName: 'Jack',
  //     lastName: 'Harkness',
  //     email: 'jack@torchwood.com',
  //     sendCatalog: false,
  //   });
  // }

  setMessage(c: AbstractControl): void {
    this.emailMessage = '';
    if ((c.touched || c.dirty) && c.errors) {
      this.emailMessage = Object.keys(c.errors)
        .map((key) => this.validationMessages[key])
        .join(' ');
    }
  }

  //patchValue > sets default value to some controls in the formGroup
  populateTestData(): void {
    this.customerForm.patchValue({
      firstName: 'Jack',
      lastName: 'Harkness',
      //no email e.g
      sendCatalog: false,
    });
  }

  // using setValidators to add required on click
  setNotification(notifyVia: string): void {
    const phoneControl = this.customerForm.get('phone');
    if (notifyVia === 'text') {
      // set a runtime validator
      phoneControl?.setValidators(Validators.required);
    } else {
      //clear all control validators
      phoneControl?.clearValidators();
    }
    //update the control value > add the validator / clear validator based on if statment
    phoneControl?.updateValueAndValidity();
  }
}
