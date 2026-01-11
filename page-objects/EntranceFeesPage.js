// @ts-check
import { expect } from '@playwright/test';
import { BasePage } from './BasePage.js';

/**
 * Page object for the entrance fees form (Pricing tab)
 */
export class EntranceFeesPage extends BasePage {
  constructor(page) {
    super(page);
    
    // Day tour fields
    this.dayTourAdultInput = '[data-testid="day-tour-adult"]';
    this.dayTourKidInput = '[data-testid="day-tour-kid"]';
    this.dayTourSeniorInput = '[data-testid="day-tour-senior"]';
    this.dayTourPwdInput = '[data-testid="day-tour-pwd"]';
    
    // Overnight fields
    this.overnightAdultInput = '[data-testid="overnight-adult"]';
    this.overnightKidInput = '[data-testid="overnight-kid"]';
    this.overnightSeniorInput = '[data-testid="overnight-senior"]';
    this.overnightPwdInput = '[data-testid="overnight-pwd"]';
    
    // Additional settings
    this.currencySelect = '[data-testid="currency"]';
    this.effectiveDateInput = '[data-testid="effective-date"]';
    
    // Buttons - use .first() since there may be multiple Save Changes buttons on settings page
    this.saveButton = this.getByRole('button', { name: /Save Changes|Saving/ }).first();
    
    // Page elements
    this.sectionTitle = this.getByRole('heading', { name: 'Entrance Fees Configuration' });
    this.sectionDescription = this.getByText('Set entrance fees for different customer types and tour options.');
    this.dayTourSection = this.getByText('Day Tour Rates');
    this.overnightSection = this.getByText('Overnight Rates');
  }

  /**
   * Verify we're on the entrance fees form
   */
  async verifyEntranceFeesForm() {
    await this.expectVisible(this.sectionTitle);
    await this.expectVisible(this.sectionDescription);
    await this.expectVisible(this.dayTourSection);
    await this.expectVisible(this.overnightSection);
    await this.expectVisible(this.saveButton);
  }

  /**
   * Fill day tour rates
   * @param {Object} dayTourRates
   * @param {number} dayTourRates.adult
   * @param {number} dayTourRates.kid
   * @param {number} dayTourRates.senior
   * @param {number} dayTourRates.pwd
   */
  async fillDayTourRates(dayTourRates) {
    const { adult, kid, senior, pwd } = dayTourRates;
    
    await this.fill(this.dayTourAdultInput, adult.toString());
    await this.fill(this.dayTourKidInput, kid.toString());
    await this.fill(this.dayTourSeniorInput, senior.toString());
    await this.fill(this.dayTourPwdInput, pwd.toString());
  }

  /**
   * Fill overnight rates
   * @param {Object} overnightRates
   * @param {number} overnightRates.adult
   * @param {number} overnightRates.kid
   * @param {number} overnightRates.senior
   * @param {number} overnightRates.pwd
   */
  async fillOvernightRates(overnightRates) {
    const { adult, kid, senior, pwd } = overnightRates;
    
    await this.fill(this.overnightAdultInput, adult.toString());
    await this.fill(this.overnightKidInput, kid.toString());
    await this.fill(this.overnightSeniorInput, senior.toString());
    await this.fill(this.overnightPwdInput, pwd.toString());
  }

  /**
   * Set currency
   * @param {string} currency - 'PHP' or 'USD'
   */
  async setCurrency(currency) {
    await this.page.selectOption(this.currencySelect, { value: currency });
  }

  /**
   * Set effective date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async setEffectiveDate(date) {
    await this.fill(this.effectiveDateInput, date);
  }

  /**
   * Fill the complete entrance fees form
   * @param {Object} feesData
   * @param {Object} feesData.dayTour - Day tour rates
   * @param {Object} feesData.overnight - Overnight rates
   * @param {string} [feesData.currency='PHP']
   * @param {string} [feesData.effectiveDate]
   */
  async fillEntranceFees(feesData) {
    const { dayTour, overnight, currency = 'PHP', effectiveDate } = feesData;

    await this.fillDayTourRates(dayTour);
    await this.fillOvernightRates(overnight);
    
    if (currency !== 'PHP') {
      await this.setCurrency(currency);
    }
    
    if (effectiveDate) {
      await this.setEffectiveDate(effectiveDate);
    }
  }

  /**
   * Save the entrance fees
   */
  async saveEntranceFees() {
    await this.saveButton.click();
    await this.waitForLoad();
  }

  /**
   * Complete flow: fill form and save
   * @param {Object} feesData - Entrance fees data object
   */
  async updateEntranceFees(feesData) {
    await this.fillEntranceFees(feesData);
    await this.saveEntranceFees();
  }

  /**
   * Get current day tour rates
   * @returns {Promise<Object>}
   */
  async getCurrentDayTourRates() {
    return {
      adult: parseFloat(await this.locator(this.dayTourAdultInput).inputValue()) || 0,
      kid: parseFloat(await this.locator(this.dayTourKidInput).inputValue()) || 0,
      senior: parseFloat(await this.locator(this.dayTourSeniorInput).inputValue()) || 0,
      pwd: parseFloat(await this.locator(this.dayTourPwdInput).inputValue()) || 0,
    };
  }

  /**
   * Get current overnight rates
   * @returns {Promise<Object>}
   */
  async getCurrentOvernightRates() {
    return {
      adult: parseFloat(await this.locator(this.overnightAdultInput).inputValue()) || 0,
      kid: parseFloat(await this.locator(this.overnightKidInput).inputValue()) || 0,
      senior: parseFloat(await this.locator(this.overnightSeniorInput).inputValue()) || 0,
      pwd: parseFloat(await this.locator(this.overnightPwdInput).inputValue()) || 0,
    };
  }

  /**
   * Verify success message is displayed
   */
  async verifySuccessMessage() {
    await this.expectTextVisible('Entrance fees updated successfully!');
  }

  /**
   * Verify rates are correctly displayed
   * @param {Object} expectedRates
   * @param {Object} expectedRates.dayTour
   * @param {Object} expectedRates.overnight
   */
  async verifyDisplayedRates(expectedRates) {
    const { dayTour, overnight } = expectedRates;
    
    const currentDayTour = await this.getCurrentDayTourRates();
    const currentOvernight = await this.getCurrentOvernightRates();
    
    // Verify day tour rates
    expect(currentDayTour.adult).toBe(dayTour.adult);
    expect(currentDayTour.kid).toBe(dayTour.kid);
    expect(currentDayTour.senior).toBe(dayTour.senior);
    expect(currentDayTour.pwd).toBe(dayTour.pwd);
    
    // Verify overnight rates
    expect(currentOvernight.adult).toBe(overnight.adult);
    expect(currentOvernight.kid).toBe(overnight.kid);
    expect(currentOvernight.senior).toBe(overnight.senior);
    expect(currentOvernight.pwd).toBe(overnight.pwd);
  }
}
