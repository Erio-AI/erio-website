/**
 * @author M.G
 */
window.PhoneInput = class PhoneInput {

  _originalInput;
  _intlTelInput;

  /*if we dont display the country code in the input, then a hidden input field and additional backend logic is
  required to capture the country code, so we hide the original input and display a dummy input for the user to enter
  the number and then set the full number on the original. only applies if svelteMode is false */

  _dummyInput;
  _svelteMode;

  _externalListener;
  _dummyListener;
  _validationListener;

  constructor(inputElement, onChange, svelteMode) {
    if (!inputElement) {
      return;
    }
    this._originalInput = typeof inputElement === 'string' ? document.querySelector(inputElement) : inputElement;
    this._svelteMode = svelteMode === true;

    const input = this._svelteMode ? this._originalInput : this._createDummyInput();
    const locale = window.locale?.split('_')[0] || 'en';

    this._loadCountries(locale).then(data => { //load locale data/translations, default to english
      this._init(input, onChange, data);
    }).catch(ex => {
      console.log("unable to load " + locale + " language pack: " + ex);
      this._loadCountries("en").then(data => {
        this._init(input, onChange, data);
      }).catch(ex1 => {
        console.log("unable to load en language pack: " + ex1);
      });
    });
  }

  static wrap(inputId, onChange) {
    return new PhoneInput(inputId, onChange);
  }

  _loadCountries(locale) {
    return import(resources + "/scripts/external/intl-tel-input/i18n/" + locale + "/index.js?v=" + resourcesVersion);
  }

  _init(input, onChange, countryData) {
    this._intlTelInput = window.intlTelInput(input, {
      utilsScript: resources + "/scripts/external/intl-tel-input/utils.js?v=" + resourcesVersion,
      i18n: countryData.default,
      strictMode: true,
      validationNumberType: null,
      initialCountry: "auto",
      geoIpLookup: (success, failure) => {
        fetch("https://ipapi.co/json")
          .then((res) => { return res.json(); })
            .then((data) => { success(data.country_code); })
            .catch(() => { failure(); });
      }
      //separateDialCode: true
    });

    this._addValidationListener(input);

    if(onChange) {
      this._addExternalListener(input, onChange);
    }
  }

  _addValidationListener(input) {
    const self = this;
    this._validationListener = () => {
      if(!input.value.length || self.isValidNumber()) {
        input.classList.remove("phone-input-error");
      } else {
        input.classList.add("phone-input-error");
      }
    }
    this._addChangeListener(input, this._validationListener);
  }

  _addExternalListener(input, onChange) {
    this._externalListener = () => {
      onChange(this.value, this.isValidNumber());
    };
    this._addChangeListener(input, this._externalListener);
  }

  updateOriginalInput() {
    if(this._intlTelInput) { //may not be loaded yet
      this._originalInput.value = this._intlTelInput.getNumber();
    }
  }

  _createDummyInput() {
    this._dummyInput = this._originalInput.cloneNode(true);
    this._dummyInput.id = this._dummyInput.id + "_dummy";
    this._dummyInput.name = ""; //dont submit the dummy value

    this._originalInput.parentNode.insertBefore(this._dummyInput, this._originalInput.nextSibling);
    this._originalInput.classList.add("phone-input-hidden");

    const self = this;
    this._dummyListener = () => {
      self.updateOriginalInput();
    }

    this._addChangeListener(this._dummyInput, this._dummyListener);
    return this._dummyInput;
  }

  _removeDummyInput() {
    this._removeChangeListener(this._dummyInput, this._dummyListener);
    this._removeChangeListener(this._dummyInput, this._validationListener);

    this._dummyInput.parentNode.removeChild(this._dummyInput);
    this._originalInput.classList.remove("phone-input-hidden");

    this._dummyInput = this._dummyListener = this._validationListener = null;
  }

  get value() { //mimics "input.value" behaviour
    return this._intlTelInput.getNumber();
  }

  isValidNumber() {
    return this._intlTelInput.isValidNumber();
  }

  getValidationError() {
    return this._intlTelInput.getValidationError();
  }

  isEmpty() {
    return this.value.length === 0;
  }

  destroy() {
    if (this._svelteMode) {
      this._removeChangeListener(this._originalInput, this._originalInput);
      this._removeChangeListener(this._originalInput, this._validationListener);
      this._validationListener = null;
    } else {
      this._removeDummyInput();
    }
    this._originalInput = null;
    this._intlTelInput.destroy();
  }

  _addChangeListener(element, listener) {
    element.addEventListener("input", listener);
    element.addEventListener("countrychange", listener);
  }

  _removeChangeListener(element, listener) {
    element.removeEventListener("input", listener);
    element.removeEventListener("countrychange", listener);
  }
}
