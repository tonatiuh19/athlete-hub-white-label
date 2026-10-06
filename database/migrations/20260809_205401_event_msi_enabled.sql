-- Mexico MSI (meses sin intereses) per-event opt-in for Stripe checkout.
ALTER TABLE `events`
  ADD COLUMN `msi_enabled` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'When 1, Stripe PaymentIntents offer MSI 3/6/9; Atleita fee uplifts only if athlete selects a plan (Y2)'
    AFTER `fee_presentation`;
