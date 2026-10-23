export default {
  checkout: {
    footer: {
      poweredBy: 'Mogelijk gemaakt door',
      merchantOfRecord:
        'De betaling wordt verwerkt via de betaalprovider die bij het afrekenen wordt getoond. Neem voor productvragen contact op met de maker en voor betalingsvragen met Blyss-support.',
      mandateSubscriptionTrial:
        'Door verder te gaan, machtigt u de betaalprovider die bij het afrekenen wordt getoond om het vermelde bedrag na de proefperiode en op elke volgende factuurdatum te innen totdat u opzegt.',
      mandateSubscription:
        'Door verder te gaan, machtigt u de betaalprovider die bij het afrekenen wordt getoond om het vermelde bedrag op elke factuurdatum te innen totdat u opzegt.',
      mandateOneTime:
        'Door verder te gaan, machtigt u de betaalprovider die bij het afrekenen wordt getoond om een eenmalige betaling van het vermelde bedrag te verwerken.',
    },
    form: {
      email: 'E-mailadres',
      cardholderName: 'Naam kaarthouder',
      purchasingAsBusiness: 'Ik koop als bedrijf',
      businessName: 'Bedrijfsnaam',
      billingAddress: {
        label: 'Factuuradres',
        postalCode: 'Postcode',
        city: 'Plaats',
        country: 'Land',
        state: 'Staat',
        province: 'Provincie',
        stateProvince: 'Staat / Provincie',
        line1: 'Straatnaam en huisnummer',
        line2: 'Appartement of busnummer',
      },
      taxId: 'Btw-nummer',
      discountCode: 'Kortingscode',
      optional: 'Optioneel',
      apply: 'Toepassen',
      fieldRequired: 'Dit veld is verplicht',
      addBusinessDetails: 'Bedrijfsgegevens toevoegen',
      removeBusinessDetails: 'Bedrijfsgegevens verwijderen',
      billingDetails: 'Bedrijfsgegevens',
      addDiscountCode: 'Kortingscode toevoegen',
    },
    pricing: {
      subtotal: 'Subtotaal',
      taxableAmount: 'Belastbaar bedrag',
      taxes: 'BTW',
      free: 'Gratis',
      payWhatYouWant: 'Betaal wat je wilt',
      total: 'Totaal',
      additionalMeteredUsage: 'Extra verbruikskosten',
      perUnit: '/ eenheid',
      discount: {
        duration: {
          months: {
            '=1': 'voor de eerste maand',
            other: 'voor de eerste # maanden',
            _mode: 'plural',
          },
          years: {
            '=1': 'voor het eerste jaar',
            other: 'voor de eerste # jaar',
            _mode: 'plural',
          },
        },
      },
      everyInterval: {
        day: {
          '=1': 'Dagelijks',
          other: 'Elke # dagen',
          '=2': 'Elke twee dagen',
          _mode: 'plural',
        },
        week: {
          '=1': 'Wekelijks',
          other: 'Elke # weken',
          '=2': 'Elke twee weken',
          _mode: 'plural',
        },
        month: {
          '=1': 'Maandelijks',
          other: 'Elke # maanden',
          '=2': 'Elke twee maanden',
          _mode: 'plural',
        },
        year: {
          '=1': 'Jaarlijks',
          other: 'Elke # jaar',
          '=2': 'Elke twee jaar',
          _mode: 'plural',
        },
      },
    },
    trial: {
      ends: 'Proefperiode eindigt op {endDate}',
      duration: {
        days: {
          '=1': '# dag proefperiode',
          other: '# dagen proefperiode',
          _mode: 'plural',
        },
        weeks: {
          '=1': '# week proefperiode',
          other: '# weken proefperiode',
          _mode: 'plural',
        },
        months: {
          '=1': '# maand proefperiode',
          other: '# maanden proefperiode',
          _mode: 'plural',
        },
        years: {
          '=1': '# jaar proefperiode',
          other: '# jaar proefperiode',
          _mode: 'plural',
        },
      },
    },
    pwywForm: {
      label: 'Kies een eerlijke prijs',
      minimum: 'minimaal {amount}',
      amountMinimum: 'Bedrag moet minimaal {min} zijn',
      amountFreeOrMinimum: 'Bedrag moet {zero} of minimaal {min} zijn',
    },
    productSwitcher: {
      billedRecurring: '{frequency} gefactureerd',
      oneTimePurchase: 'Eenmalige aankoop',
    },
    card: {
      included: 'Inbegrepen',
    },
    benefits: {
      moreBenefits: {
        '=1': '# extra voordeel',
        other: '# extra voordelen',
        _mode: 'plural',
      },
      showMoreBenefits: {
        '=1': 'Toon # extra voordeel',
        other: 'Toon # extra voordelen',
        _mode: 'plural',
      },
      showLess: 'Toon minder',
      granting: 'Voordelen toekennen...',
      requestNewInvite: 'Nieuwe uitnodiging aanvragen',
      retryIn: {
        '=1': 'Probeer opnieuw over # seconde',
        other: 'Probeer opnieuw over # seconden',
        _mode: 'plural',
      },
      connectNewAccount: 'Nieuw account koppelen',
      requestMyInvite: 'Mijn uitnodiging aanvragen',
      github: {
        connect: 'GitHub-account koppelen',
        goTo: 'Ga naar {repository}',
        selectAccount: 'Selecteer een GitHub-account',
      },
      discord: {
        connect: 'Discord-account koppelen',
        open: 'Discord openen',
        selectAccount: 'Selecteer een Discord-account',
      },
      licenseKey: {
        copy: 'Kopiëren',
        copiedToClipboard: 'Gekopieerd naar klembord',
        copiedToClipboardDescription:
          'Licentiesleutel is gekopieerd naar klembord',
        loading: 'Laden...',
        status: 'Status',
        statusGranted: 'Toegekend',
        statusRevoked: 'Ingetrokken',
        statusDisabled: 'Uitgeschakeld',
        usage: 'Gebruik',
        validations: 'Validaties',
        validatedAt: 'Gevalideerd op',
        neverValidated: 'Nooit gevalideerd',
        expiryDate: 'Vervaldatum',
        noExpiry: 'Verloopt niet',
        activations: 'Activaties',
        activationDeleted: 'Licentiesleutelactivatie verwijderd',
        activationDeletedDescription: 'Activatie succesvol verwijderd',
        activationDeactivationFailed: 'Deactiveren mislukt',
      },
    },
    confirmation: {
      confirmPayment: 'Betaling bevestigen',
      processingTitle: 'We verwerken je bestelling',
      successTitle: 'Je bestelling is geslaagd!',
      failedTitle:
        'Er is een probleem opgetreden bij het verwerken van je bestelling',
      processingDescription:
        'Een ogenblik geduld terwijl we je betaling bevestigen.',
      successDescription: 'Je hebt nu toegang tot de voordelen van {product}.',
      failedDescription: 'Probeer het opnieuw of neem contact op met support.',
    },
    loading: {
      processingOrder: 'Bestelling verwerken...',
      processingPayment: 'Betaling verwerken',
      paymentSuccessful: 'Betaling geslaagd! Je producten worden klaargezet...',
      confirmationTokenFailed:
        'Bevestigingstoken aanmaken mislukt, probeer het later opnieuw.',
    },
    cta: {
      startTrial: 'Proefperiode starten',
      subscribeNow: 'Nu abonneren',
      payNow: 'Nu betalen',
      getFree: 'Gratis verkrijgen',
      paymentsUnavailable: 'Betalingen zijn momenteel niet beschikbaar',
    },
    productDescription: {
      readMore: 'Lees meer',
      readLess: 'Lees minder',
    },
  },
  intervals: {
    short: {
      day: 'dg',
      week: 'wk',
      month: 'mnd',
      year: 'jr',
    },
  },
  benefitTypes: {
    custom: 'Aangepast',
    license_keys: 'Licentiesleutels',
    github_repository: 'Toegang tot GitHub-repository',
    discord: 'Discord-uitnodiging',
    downloadables: 'Bestandsdownloads',
    meter_credit: 'Verbruikstegoed',
    feature_flag: 'Feature flag',
  },
  ordinal: {
    zero: 'de',
    one: 'e',
    two: 'e',
    few: 'e',
    many: 'e',
    other: 'e',
  },
} as const
