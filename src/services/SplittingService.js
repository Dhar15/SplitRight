// // services/SplittingService.js
// export class SplittingService {
//   constructor() {
//     // Default tax rates by category for calculation purposes
//     this.defaultTaxRates = {
//       food: 0.05,    // 5%
//       drinks: 0.18,  // 18%
//       service: 0.10, // 10%
//       other: 0.12    // 12%
//     };
//   }

//   // Core splitting calculation engine
//   calculateSplit(billData, groupMembers, splitConfig) {
//     const {
//       items,
//       subtotal,
//       taxes,
//       discounts,
//       tips,
//       serviceCharges,
//       grandTotal
//     } = billData;

//     const { 
//       itemSelections, 
//       tipStrategy = 'proportional', 
//       discountStrategy = 'proportional', 
//       taxStrategy = 'proportional',
//       customRatios = {}, // For custom split ratios
//       paymentData = {} // Who paid for each item
//     } = splitConfig;

//     const result = {
//       itemSplits: [],
//       memberBaseCosts: {},
//       memberDiscountContributions: {},
//       memberTaxContributions: {},
//       memberTipServiceContributions: {},
//       finalAmounts: {},
//       memberPayments: {},
//       settlements: [],
//       breakdown: {
//         totalItems: 0,
//         totalDiscounts: 0,
//         totalTaxes: 0,
//         totalTipsAndService: 0
//       }
//     };

//     // Initialize member contributions
//     groupMembers.forEach(member => {
//       result.memberBaseCosts[member.id] = 0;
//       result.memberDiscountContributions[member.id] = 0;
//       result.memberTaxContributions[member.id] = 0;
//       result.memberTipServiceContributions[member.id] = 0;
//       result.finalAmounts[member.id] = 0;
//       result.memberPayments[member.id] = 0;
//     });

//     console.log("SplittingService: calculateSplit called with:", {
//       billData,
//       groupMembers,
//       splitConfig,
//     });

//     // --- Step 1: Split individual items & calculate memberBaseCosts ---
//     result.itemSplits = items.map(item => {
//       const selectedMembers = itemSelections[item.id] || [];
//       if (selectedMembers.length === 0) {
//         console.warn(`Item "${item.name}" (ID: ${item.id}) is not assigned to any member. Skipping.`);
//         return {
//           itemId: item.id,
//           itemName: item.name,
//           totalAmount: item.amount,
//           category: item.category,
//           memberShares: []
//         };
//       }

//       const sharePerMember = item.amount / selectedMembers.length;
//       const shares = selectedMembers.map(memberId => {
//         result.memberBaseCosts[memberId] += sharePerMember;
//         return { memberId, amount: sharePerMember };
//       });

//       // NEW: Track who paid for this item
//       const payerId = paymentData[item.id];
//       if (payerId) {
//         result.memberPayments[payerId] += item.amount;
//       }

//       return {
//         itemId: item.id,
//         itemName: item.name,
//         totalAmount: item.amount,
//         category: item.category,
//         memberShares: shares,
//         paidBy: payerId
//       };
//     });

//     // Calculate total base cost of items actually assigned
//     const totalAssignedBaseCost = Object.values(result.memberBaseCosts).reduce((sum, val) => sum + val, 0);
//     result.breakdown.totalItems = totalAssignedBaseCost;

//     // --- Step 2: Apply Discounts ---
//     if (discounts && discounts.length > 0) {
//       const totalDiscountAmount = discounts.reduce((sum, discount) => {
//         return sum + this._applySingleDiscount(
//           discount,
//           result.memberBaseCosts,
//           result.memberDiscountContributions,
//           items,
//           itemSelections,
//           discountStrategy,
//           groupMembers,
//           result.itemSplits,
//           customRatios.discount
//         );
//       }, 0);
//       result.breakdown.totalDiscounts = totalDiscountAmount;
//     }

//     // --- Step 3: Apply Taxes ---
//     const totalTaxes = taxes || 0;
//     if (totalTaxes > 0) {
//       this._allocateAggregateTax(
//         totalTaxes,
//         result.memberBaseCosts,
//         result.memberDiscountContributions,
//         result.memberTaxContributions,
//         groupMembers,
//         taxStrategy,
//         items,
//         itemSelections,
//         result.itemSplits,
//         customRatios.tax
//       );
//       result.breakdown.totalTaxes = totalTaxes;
//     }

//     // --- Step 4: Split Tips and Service Charges ---
//     const totalTipsAndCharges = (tips || 0) + (serviceCharges || 0);
//     if (totalTipsAndCharges > 0) {
//       this._splitAdditionalCharges(
//         totalTipsAndCharges,
//         groupMembers,
//         tipStrategy,
//         result.memberBaseCosts,
//         result.memberDiscountContributions,
//         result.memberTaxContributions,
//         result.memberTipServiceContributions,
//         customRatios.tip,
//         result.memberPayments,
//         paymentData
//       );
//       result.breakdown.totalTipsAndService = totalTipsAndCharges;
//     }

//     // After member contributions are calculated (before finalAmounts):
//     console.log("SplittingService: memberBaseCosts:", result.memberBaseCosts);
//     console.log("SplittingService: memberDiscountContributions:", result.memberDiscountContributions);
//     console.log("SplittingService: memberTaxContributions:", result.memberTaxContributions);
//     console.log("SplittingService: memberTipServiceContributions:", result.memberTipServiceContributions);
//     console.log("SplittingService: memberPayments:", result.memberPayments);

//     // --- Step 5: Calculate final amounts ---
//     groupMembers.forEach(member => {
//       result.finalAmounts[member.id] =
//         result.memberBaseCosts[member.id] -
//         result.memberDiscountContributions[member.id] +
//         result.memberTaxContributions[member.id] +
//         result.memberTipServiceContributions[member.id];
//     });

//     console.log("SplittingService: Calculated finalAmounts:", result.finalAmounts);

//     // --- Step 6: Generate settlement suggestions ---
//     result.settlements = this.generateSettlements(result.finalAmounts, result.memberPayments, groupMembers);

//     console.log("SplittingService: Generated settlements:", result.settlements);

//     if (!result.settlements || result.settlements.length === 0) {
//       console.warn("SplittingService: Settlements array is empty or null after generation!");
//     }

//     // Round all amounts to 2 decimal places for display
//     this._roundAllAmounts(result, groupMembers);

//     console.log("SplittingService: Final splitResult to return:", result);

//     return result;
//   }

//   // --- Helper Methods for Allocation ---
//   _applySingleDiscount(
//     discount,
//     memberBaseCosts,
//     memberDiscountContributions,
//     allItems,
//     itemSelections,
//     strategy,
//     groupMembers,
//     itemSplits,
//     customRatios
//   ) {
//     let effectiveDiscountAmount = 0;
//     let relevantMembers = new Set();
//     let memberRelevantCosts = {}; // How much each member spent on relevant items

//     // Initialize memberRelevantCosts
//     groupMembers.forEach(member => {
//       memberRelevantCosts[member.id] = 0;
//     });

//     switch (discount.type) {
//       case 'percentage':
//         // Apply percentage discount to all items
//         allItems.forEach(item => {
//           const selectedMembers = itemSelections[item.id] || [];
//           selectedMembers.forEach(memberId => {
//             relevantMembers.add(memberId);
//             memberRelevantCosts[memberId] += item.amount / selectedMembers.length;
//           });
//         });
//         effectiveDiscountAmount = Object.values(memberRelevantCosts).reduce((sum, val) => sum + val, 0) * (discount.value / 100);
//         break;

//       case 'flat':
//         // Apply flat discount to all members who ordered items
//         groupMembers.forEach(member => {
//           if (memberBaseCosts[member.id] > 0) {
//             relevantMembers.add(member.id);
//             memberRelevantCosts[member.id] = memberBaseCosts[member.id];
//           }
//         });
//         effectiveDiscountAmount = discount.value;
//         break;

//       case 'category':
//         // Apply discount only to items in specific category
//         allItems.forEach(item => {
//           if (item.category === discount.category) {
//             const selectedMembers = itemSelections[item.id] || [];
//             selectedMembers.forEach(memberId => {
//               relevantMembers.add(memberId);
//               if (!memberRelevantCosts[memberId]) memberRelevantCosts[memberId] = 0;
//               memberRelevantCosts[memberId] += item.amount / selectedMembers.length;
//             });
//           }
//         });
//         const totalCategoryAmount = Object.values(memberRelevantCosts).reduce((sum, val) => sum + val, 0);
//         effectiveDiscountAmount = totalCategoryAmount * (discount.value / 100);
//         break;

//       default:
//         console.warn(`Unknown discount type: ${discount.type}`);
//         return 0;
//     }

//     // Distribute the discount among relevant members
//     if (effectiveDiscountAmount > 0 && relevantMembers.size > 0) {
//       this._distributeAmount(
//         effectiveDiscountAmount,
//         relevantMembers,
//         memberRelevantCosts,
//         memberDiscountContributions,
//         strategy,
//         customRatios,
//         groupMembers
//       );
//     }

//     return effectiveDiscountAmount;
//   }

//   _allocateAggregateTax(
//     totalTaxes,
//     memberBaseCosts,
//     memberDiscountContributions,
//     memberTaxContributions,
//     groupMembers,
//     taxStrategy,
//     items,
//     itemSelections,
//     itemSplits,
//     customRatios
//   ) {
//     // Calculate taxable amount for each member (base cost - discounts)
//     const memberTaxableAmounts = {};
//     groupMembers.forEach(member => {
//       memberTaxableAmounts[member.id] = Math.max(0, 
//         memberBaseCosts[member.id] - memberDiscountContributions[member.id]
//       );
//     });

//     const totalTaxableAmount = Object.values(memberTaxableAmounts).reduce((sum, val) => sum + val, 0);
//     const relevantMembers = new Set(groupMembers.map(m => m.id));

//     if (totalTaxableAmount <= 0 && taxStrategy !== 'equal') {
//       console.warn("No taxable base for tax allocation. Distributing tax equally.");
//       this._distributeAmount(
//         totalTaxes,
//         relevantMembers,
//         memberTaxableAmounts,
//         memberTaxContributions,
//         'equal',
//         null,
//         groupMembers
//       );
//       return;
//     }

//     this._distributeAmount(
//       totalTaxes,
//       relevantMembers,
//       memberTaxableAmounts,
//       memberTaxContributions,
//       taxStrategy,
//       customRatios,
//       groupMembers
//     );
//   }

//   _splitAdditionalCharges(
//     totalAmount,
//     groupMembers,
//     strategy,
//     memberBaseCosts,
//     memberDiscountContributions,
//     memberTaxContributions,
//     memberTipServiceContributions,
//     customRatios,
//     memberPayments,
//     paymentData
//   ) {
//     // Calculate amount before tips for each member
//     const memberAmountsBeforeTips = {};
//     groupMembers.forEach(member => {
//       memberAmountsBeforeTips[member.id] = 
//         memberBaseCosts[member.id] - 
//         memberDiscountContributions[member.id] + 
//         memberTaxContributions[member.id];
//     });

//     const relevantMembers = new Set(groupMembers.map(m => m.id));

//     this._distributeAmount(
//       totalAmount,
//       relevantMembers,
//       memberAmountsBeforeTips,
//       memberTipServiceContributions,
//       strategy,
//       customRatios,
//       groupMembers
//     );

//     // NEW: Add tips/service charges to the payments of whoever paid
//     const totalPaid = Object.values(memberPayments).reduce((sum, val) => sum + val, 0);
//     if (totalPaid > 0) {
//       groupMembers.forEach(member => {
//         if (memberPayments[member.id] > 0) {
//           const paymentRatio = memberPayments[member.id] / totalPaid;
//           memberPayments[member.id] += totalAmount * paymentRatio;
//         }
//       });
//     }
//   }

//   // Generic method to distribute amounts based on strategy
//   _distributeAmount(
//     totalAmount,
//     relevantMembers,
//     memberBaseAmounts,
//     targetContributions,
//     strategy,
//     customRatios,
//     groupMembers
//   ) {
//     const relevantMembersArray = Array.from(relevantMembers);
//     const totalBaseAmount = Object.values(memberBaseAmounts).reduce((sum, val) => sum + val, 0);

//     switch (strategy) {
//       case 'equal':
//         const equalShare = totalAmount / relevantMembersArray.length;
//         relevantMembersArray.forEach(memberId => {
//           targetContributions[memberId] += equalShare;
//         });
//         break;

//       case 'proportional':
//         if (totalBaseAmount === 0) {
//           console.warn("No base for proportional allocation. Distributing equally.");
//           const equalShareFallback = totalAmount / relevantMembersArray.length;
//           relevantMembersArray.forEach(memberId => {
//             targetContributions[memberId] += equalShareFallback;
//           });
//           return;
//         }

//         relevantMembersArray.forEach(memberId => {
//           const proportion = (memberBaseAmounts[memberId] || 0) / totalBaseAmount;
//           targetContributions[memberId] += totalAmount * proportion;
//         });
//         break;

//       case 'custom':
//         if (!customRatios || Object.keys(customRatios).length === 0) {
//           console.warn("No custom ratios provided. Falling back to equal distribution.");
//           const equalShareFallback = totalAmount / relevantMembersArray.length;
//           relevantMembersArray.forEach(memberId => {
//             targetContributions[memberId] += equalShareFallback;
//           });
//           return;
//         }

//         const totalPercentage = Object.values(customRatios).reduce((sum, val) => sum + val, 0);

//         if (Math.abs(totalPercentage - 100) > 0.01) {
//           console.warn("Custom percentages must sum to 100. Falling back to equal split.");
//           const equalShare = totalAmount / relevantMembersArray.length;
//           relevantMembersArray.forEach(memberId => {
//             targetContributions[memberId] += equalShare;
//           });
//           return;
//         }

//         relevantMembersArray.forEach(memberId => {
//           const percent = customRatios[memberId] || 0;
//           targetContributions[memberId] += totalAmount * (percent / 100);
//         });
//         break;

//       default:
//         // Default to proportional
//         if (totalBaseAmount > 0) {
//           relevantMembersArray.forEach(memberId => {
//             const proportion = (memberBaseAmounts[memberId] || 0) / totalBaseAmount;
//             targetContributions[memberId] += totalAmount * proportion;
//           });
//         } else {
//           const equalShareFallback = totalAmount / relevantMembersArray.length;
//           relevantMembersArray.forEach(memberId => {
//             targetContributions[memberId] += equalShareFallback;
//           });
//         }
//         break;
//     }
//   }

//   _roundAllAmounts(result, groupMembers) {
//     groupMembers.forEach(member => {
//       result.memberBaseCosts[member.id] = parseFloat(result.memberBaseCosts[member.id].toFixed(2));
//       result.memberDiscountContributions[member.id] = parseFloat(result.memberDiscountContributions[member.id].toFixed(2));
//       result.memberTaxContributions[member.id] = parseFloat(result.memberTaxContributions[member.id].toFixed(2));
//       result.memberTipServiceContributions[member.id] = parseFloat(result.memberTipServiceContributions[member.id].toFixed(2));
//       result.finalAmounts[member.id] = parseFloat(result.finalAmounts[member.id].toFixed(2));
//       result.memberPayments[member.id] = parseFloat(result.memberPayments[member.id].toFixed(2)); // NEW: Round payments
//     });

//     // Round breakdown totals
//     Object.keys(result.breakdown).forEach(key => {
//       result.breakdown[key] = parseFloat(result.breakdown[key].toFixed(2));
//     });
//   }

//   // Generate settlement suggestions (who owes whom)
//   generateSettlements(finalAmounts, memberPayments, groupMembers) {
//      console.log("generateSettlements: Received finalAmounts:", finalAmounts);
//     console.log("generateSettlements: Received memberPayments:", memberPayments);

//     const settlements = [];
//     const netBalances = {};
//     const memberMap = {};
    
//     groupMembers.forEach(member => {
//       memberMap[member.id] = member;
//       netBalances[member.id] = (memberPayments[member.id] || 0) - (finalAmounts[member.id] || 0);
//     });

//     console.log("generateSettlements: Calculated net balances:", netBalances);

//     // Create sorted arrays for optimization
//     const creditors = Object.entries(netBalances)
//       .filter(([, balance]) => balance > 0.001)
//       .sort(([,a], [,b]) => b - a);
    
//     const debtors = Object.entries(netBalances)
//       .filter(([, balance]) => balance < -0.001)
//       .map(([id, balance]) => [id, Math.abs(balance)])
//       .sort(([,a], [,b]) => b - a);

//     console.log("generateSettlements: Creditors (owed money):", creditors);
//     console.log("generateSettlements: Debtors (owe money):", debtors)

//     // Minimize transactions using greedy approach
//     let i = 0, j = 0;
//     while (i < creditors.length && j < debtors.length) {
//       const [creditorId, creditAmount] = creditors[i];
//       const [debtorId, debtAmount] = debtors[j];
//       const settleAmount = Math.min(creditAmount, debtAmount);

//       if (settleAmount > 0.01) { // Avoid tiny settlements
//         settlements.push({
//           from: debtorId,
//           fromName: memberMap[debtorId].name,
//           to: creditorId,
//           toName: memberMap[creditorId].name,
//           amount: parseFloat(settleAmount.toFixed(2))
//         });
//       }

//       creditors[i][1] -= settleAmount;
//       debtors[j][1] -= settleAmount;

//       if (creditors[i][1] <= 0.01) i++;
//       if (debtors[j][1] <= 0.01) j++;
//     }

//     console.log("generateSettlements: Settlements generated:", settlements);
    
//     return settlements;
//   }

//   // Generate summary for export
//   generateSummary(splitResult, groupData, billData) {
//     return {
//       groupName: groupData.name,
//       billDate: billData.date,
//       totalAmount: billData.grandTotal,
//       subtotal: billData.subtotal,
//       members: groupData.members,
//       itemBreakdown: splitResult.itemSplits,
//       memberTotals: splitResult.finalAmounts,
//       memberPayments: splitResult.memberPayments,
//       settlements: splitResult.settlements,
//       breakdown: splitResult.breakdown,
//       // Detailed contributions for transparency
//       contributions: {
//         baseCosts: splitResult.memberBaseCosts,
//         discounts: splitResult.memberDiscountContributions,
//         taxes: splitResult.memberTaxContributions,
//         tipsAndService: splitResult.memberTipServiceContributions
//       }
//     };
//   }

//   // Utility method to validate split configuration
//   validateSplitConfig(splitConfig, items, groupMembers) {
//     const errors = [];
    
//     // Check if all items are assigned to at least one member
//     items.forEach(item => {
//       const selectedMembers = splitConfig.itemSelections[item.id] || [];
//       if (selectedMembers.length === 0) {
//         errors.push(`Item "${item.name}" is not assigned to any member`);
//       }
//     });

//     // Check if all items have a payer assigned
//     items.forEach(item => {
//       const payerId = splitConfig.paymentData?.[item.id];
//       if (!payerId) {
//         errors.push(`Item "${item.name}" doesn't have a payer assigned`);
//       }
//     });

//     // Check if all selected member IDs exist
//     const memberIds = new Set(groupMembers.map(m => m.id));
//     Object.values(splitConfig.itemSelections).forEach(memberList => {
//       memberList.forEach(memberId => {
//         if (!memberIds.has(memberId)) {
//           errors.push(`Invalid member ID: ${memberId}`);
//         }
//       });
//     });

//      // Validate payment data
//     if (splitConfig.paymentData) {
//       Object.values(splitConfig.paymentData).forEach(payerId => {
//         if (payerId && !memberIds.has(payerId)) {
//           errors.push(`Invalid payer ID: ${payerId}`);
//         }
//       });
//     }

//     // Validate custom ratios if provided
//     if (splitConfig.customRatios) {
//       Object.keys(splitConfig.customRatios).forEach(category => {
//         const ratios = splitConfig.customRatios[category];
//         if (ratios && typeof ratios === 'object') {
//           Object.keys(ratios).forEach(memberId => {
//             if (!memberIds.has(memberId)) {
//               errors.push(`Invalid member ID in custom ratios: ${memberId}`);
//             }
//             if (typeof ratios[memberId] !== 'number' || ratios[memberId] < 0) {
//               errors.push(`Invalid ratio for member ${memberId}: must be a non-negative number`);
//             }
//           });
//         }
//       });
//     }

//     return errors;
//   }
// }

// // Export singleton instance
// export const splittingService = new SplittingService();

// services/SplittingService.js
export class SplittingService {
  constructor() {
    // Default tax rates by category for calculation purposes
    this.defaultTaxRates = {
      food: 0.05,    // 5%
      drinks: 0.18,  // 18%
      service: 0.10, // 10%
      other: 0.12    // 12%
    };
  }

  // Core splitting calculation engine
  calculateSplit(billData, groupMembers, splitConfig) {
    const {
      items,
      subtotal,
      taxes,
      discounts,
      tips,
      serviceCharges,
      grandTotal
    } = billData;

    const { 
      itemSelections, 
      tipStrategy = 'proportional', 
      discountStrategy = 'proportional', 
      taxStrategy = 'proportional',
      customRatios = {}, // For custom split ratios
      billPayment = {} // NEW: Complete bill payment tracking
    } = splitConfig;

    const result = {
      itemSplits: [],
      memberBaseCosts: {},
      memberDiscountContributions: {},
      memberTaxContributions: {},
      memberTipServiceContributions: {},
      finalAmounts: {},
      memberPayments: {},
      settlements: [],
      breakdown: {
        totalItems: 0,
        totalDiscounts: 0,
        totalTaxes: 0,
        totalTipsAndService: 0
      }
    };

    // Initialize member contributions
    groupMembers.forEach(member => {
      result.memberBaseCosts[member.id] = 0;
      result.memberDiscountContributions[member.id] = 0;
      result.memberTaxContributions[member.id] = 0;
      result.memberTipServiceContributions[member.id] = 0;
      result.finalAmounts[member.id] = 0;
      result.memberPayments[member.id] = 0;
    });

    console.log("SplittingService: calculateSplit called with:", {
      billData,
      groupMembers,
      splitConfig,
    });

    // --- Step 1: Split individual items & calculate memberBaseCosts ---
    result.itemSplits = items.map(item => {
      const selectedMembers = itemSelections[item.id] || [];
      if (selectedMembers.length === 0) {
        console.warn(`Item "${item.name}" (ID: ${item.id}) is not assigned to any member. Skipping.`);
        return {
          itemId: item.id,
          itemName: item.name,
          totalAmount: item.amount,
          category: item.category,
          memberShares: []
        };
      }

      const sharePerMember = item.amount / selectedMembers.length;
      const shares = selectedMembers.map(memberId => {
        result.memberBaseCosts[memberId] += sharePerMember;
        return { memberId, amount: sharePerMember };
      });

      return {
        itemId: item.id,
        itemName: item.name,
        totalAmount: item.amount,
        category: item.category,
        memberShares: shares
      };
    });

    // Calculate total base cost of items actually assigned
    const totalAssignedBaseCost = Object.values(result.memberBaseCosts).reduce((sum, val) => sum + val, 0);
    result.breakdown.totalItems = totalAssignedBaseCost;

    // --- Step 2: Apply Discounts ---
    if (discounts && discounts.length > 0) {
      const totalDiscountAmount = discounts.reduce((sum, discount) => {
        return sum + this._applySingleDiscount(
          discount,
          result.memberBaseCosts,
          result.memberDiscountContributions,
          items,
          itemSelections,
          discountStrategy,
          groupMembers,
          result.itemSplits,
          customRatios.discount
        );
      }, 0);
      result.breakdown.totalDiscounts = totalDiscountAmount;
    }

    // --- Step 3: Apply Taxes ---
    const totalTaxes = taxes || 0;
    if (totalTaxes > 0) {
      this._allocateAggregateTax(
        totalTaxes,
        result.memberBaseCosts,
        result.memberDiscountContributions,
        result.memberTaxContributions,
        groupMembers,
        taxStrategy,
        items,
        itemSelections,
        result.itemSplits,
        customRatios.tax
      );
      result.breakdown.totalTaxes = totalTaxes;
    }

    // --- Step 4: Split Tips and Service Charges ---
    const totalTipsAndCharges = (tips || 0) + (serviceCharges || 0);
    if (totalTipsAndCharges > 0) {
      this._splitAdditionalCharges(
        totalTipsAndCharges,
        groupMembers,
        tipStrategy,
        result.memberBaseCosts,
        result.memberDiscountContributions,
        result.memberTaxContributions,
        result.memberTipServiceContributions,
        customRatios.tip
      );
      result.breakdown.totalTipsAndService = totalTipsAndCharges;
    }

    // --- Step 5: NEW - Process Complete Bill Payment ---
    this._processBillPayment(billPayment, billData, result);

    // After member contributions are calculated (before finalAmounts):
    console.log("SplittingService: memberBaseCosts:", result.memberBaseCosts);
    console.log("SplittingService: memberDiscountContributions:", result.memberDiscountContributions);
    console.log("SplittingService: memberTaxContributions:", result.memberTaxContributions);
    console.log("SplittingService: memberTipServiceContributions:", result.memberTipServiceContributions);
    console.log("SplittingService: memberPayments:", result.memberPayments);

    // --- Step 6: Calculate final amounts ---
    groupMembers.forEach(member => {
      result.finalAmounts[member.id] =
        result.memberBaseCosts[member.id] -
        result.memberDiscountContributions[member.id] +
        result.memberTaxContributions[member.id] +
        result.memberTipServiceContributions[member.id];
    });

    console.log("SplittingService: Calculated finalAmounts:", result.finalAmounts);

    // --- Step 7: Generate settlement suggestions ---
    result.settlements = this.generateSettlements(result.finalAmounts, result.memberPayments, groupMembers);

    console.log("SplittingService: Generated settlements:", result.settlements);

    if (!result.settlements || result.settlements.length === 0) {
      console.warn("SplittingService: Settlements array is empty or null after generation!");
    }

    // Round all amounts to 2 decimal places for display
    this._roundAllAmounts(result, groupMembers);

    console.log("SplittingService: Final splitResult to return:", result);
    return result;
  }

  // NEW: Process complete bill payment tracking
  _processBillPayment(billPayment, billData, result) {
    const { payerId, components } = billPayment;
    
    if (!payerId) {
      console.warn("No bill payer specified. Settlements may be inaccurate.");
      return;
    }

    // Calculate total bill amount
    const totalBillAmount = billData.grandTotal || 
      (billData.subtotal || 0) + 
      (billData.taxes || 0) + 
      (billData.tips || 0) + 
      (billData.serviceCharges || 0) - 
      (billData.discounts?.reduce((sum, d) => sum + (d.value || 0), 0) || 0);

    // Credit the payer with the full bill amount
    result.memberPayments[payerId] = totalBillAmount;

    console.log(`Bill payment processed: ${payerId} paid ₹${totalBillAmount}`);
  }

  // --- Helper Methods for Allocation ---
  _applySingleDiscount(
    discount,
    memberBaseCosts,
    memberDiscountContributions,
    allItems,
    itemSelections,
    strategy,
    groupMembers,
    itemSplits,
    customRatios
  ) {
    let effectiveDiscountAmount = 0;
    let relevantMembers = new Set();
    let memberRelevantCosts = {}; // How much each member spent on relevant items

    // Initialize memberRelevantCosts
    groupMembers.forEach(member => {
      memberRelevantCosts[member.id] = 0;
    });

    switch (discount.type) {
      case 'percentage':
        // Apply percentage discount to all items
        allItems.forEach(item => {
          const selectedMembers = itemSelections[item.id] || [];
          selectedMembers.forEach(memberId => {
            relevantMembers.add(memberId);
            memberRelevantCosts[memberId] += item.amount / selectedMembers.length;
          });
        });
        effectiveDiscountAmount = Object.values(memberRelevantCosts).reduce((sum, val) => sum + val, 0) * (discount.value / 100);
        break;

      case 'flat':
        // Apply flat discount to all members who ordered items
        groupMembers.forEach(member => {
          if (memberBaseCosts[member.id] > 0) {
            relevantMembers.add(member.id);
            memberRelevantCosts[member.id] = memberBaseCosts[member.id];
          }
        });
        effectiveDiscountAmount = discount.value;
        break;

      case 'category':
        // Apply discount only to items in specific category
        allItems.forEach(item => {
          if (item.category === discount.category) {
            const selectedMembers = itemSelections[item.id] || [];
            selectedMembers.forEach(memberId => {
              relevantMembers.add(memberId);
              if (!memberRelevantCosts[memberId]) memberRelevantCosts[memberId] = 0;
              memberRelevantCosts[memberId] += item.amount / selectedMembers.length;
            });
          }
        });
        const totalCategoryAmount = Object.values(memberRelevantCosts).reduce((sum, val) => sum + val, 0);
        effectiveDiscountAmount = totalCategoryAmount * (discount.value / 100);
        break;

      default:
        console.warn(`Unknown discount type: ${discount.type}`);
        return 0;
    }

    // Distribute the discount among relevant members
    if (effectiveDiscountAmount > 0 && relevantMembers.size > 0) {
      this._distributeAmount(
        effectiveDiscountAmount,
        relevantMembers,
        memberRelevantCosts,
        memberDiscountContributions,
        strategy,
        customRatios,
        groupMembers
      );
    }

    return effectiveDiscountAmount;
  }

  _allocateAggregateTax(
    totalTaxes,
    memberBaseCosts,
    memberDiscountContributions,
    memberTaxContributions,
    groupMembers,
    taxStrategy,
    items,
    itemSelections,
    itemSplits,
    customRatios
  ) {
    // Calculate taxable amount for each member (base cost - discounts)
    const memberTaxableAmounts = {};
    groupMembers.forEach(member => {
      memberTaxableAmounts[member.id] = Math.max(0, 
        memberBaseCosts[member.id] - memberDiscountContributions[member.id]
      );
    });

    const totalTaxableAmount = Object.values(memberTaxableAmounts).reduce((sum, val) => sum + val, 0);
    const relevantMembers = new Set(groupMembers.map(m => m.id));

    if (totalTaxableAmount <= 0 && taxStrategy !== 'equal') {
      console.warn("No taxable base for tax allocation. Distributing tax equally.");
      this._distributeAmount(
        totalTaxes,
        relevantMembers,
        memberTaxableAmounts,
        memberTaxContributions,
        'equal',
        null,
        groupMembers
      );
      return;
    }

    this._distributeAmount(
      totalTaxes,
      relevantMembers,
      memberTaxableAmounts,
      memberTaxContributions,
      taxStrategy,
      customRatios,
      groupMembers
    );
  }

  _splitAdditionalCharges(
    totalAmount,
    groupMembers,
    strategy,
    memberBaseCosts,
    memberDiscountContributions,
    memberTaxContributions,
    memberTipServiceContributions,
    customRatios
  ) {
    // Calculate amount before tips for each member
    const memberAmountsBeforeTips = {};
    groupMembers.forEach(member => {
      memberAmountsBeforeTips[member.id] = 
        memberBaseCosts[member.id] - 
        memberDiscountContributions[member.id] + 
        memberTaxContributions[member.id];
    });

    const relevantMembers = new Set(groupMembers.map(m => m.id));

    this._distributeAmount(
      totalAmount,
      relevantMembers,
      memberAmountsBeforeTips,
      memberTipServiceContributions,
      strategy,
      customRatios,
      groupMembers
    );
  }

  // Generic method to distribute amounts based on strategy
  _distributeAmount(
    totalAmount,
    relevantMembers,
    memberBaseAmounts,
    targetContributions,
    strategy,
    customRatios,
    groupMembers
  ) {
    const relevantMembersArray = Array.from(relevantMembers);
    const totalBaseAmount = Object.values(memberBaseAmounts).reduce((sum, val) => sum + val, 0);

    switch (strategy) {
      case 'equal':
        const equalShare = totalAmount / relevantMembersArray.length;
        relevantMembersArray.forEach(memberId => {
          targetContributions[memberId] += equalShare;
        });
        break;

      case 'proportional':
        if (totalBaseAmount === 0) {
          console.warn("No base for proportional allocation. Distributing equally.");
          const equalShareFallback = totalAmount / relevantMembersArray.length;
          relevantMembersArray.forEach(memberId => {
            targetContributions[memberId] += equalShareFallback;
          });
          return;
        }

        relevantMembersArray.forEach(memberId => {
          const proportion = (memberBaseAmounts[memberId] || 0) / totalBaseAmount;
          targetContributions[memberId] += totalAmount * proportion;
        });
        break;

      case 'custom':
        if (!customRatios || Object.keys(customRatios).length === 0) {
          console.warn("No custom ratios provided. Falling back to equal distribution.");
          const equalShareFallback = totalAmount / relevantMembersArray.length;
          relevantMembersArray.forEach(memberId => {
            targetContributions[memberId] += equalShareFallback;
          });
          return;
        }

        const totalPercentage = Object.values(customRatios).reduce((sum, val) => sum + val, 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
          console.warn("Custom percentages must sum to 100. Falling back to equal split.");
          const equalShare = totalAmount / relevantMembersArray.length;
          relevantMembersArray.forEach(memberId => {
            targetContributions[memberId] += equalShare;
          });
          return;
        }

        relevantMembersArray.forEach(memberId => {
          const percent = customRatios[memberId] || 0;
          targetContributions[memberId] += totalAmount * (percent / 100);
        });
        break;

      default:
        // Default to proportional
        if (totalBaseAmount > 0) {
          relevantMembersArray.forEach(memberId => {
            const proportion = (memberBaseAmounts[memberId] || 0) / totalBaseAmount;
            targetContributions[memberId] += totalAmount * proportion;
          });
        } else {
          const equalShareFallback = totalAmount / relevantMembersArray.length;
          relevantMembersArray.forEach(memberId => {
            targetContributions[memberId] += equalShareFallback;
          });
        }
        break;
    }
  }

  _roundAllAmounts(result, groupMembers) {
    groupMembers.forEach(member => {
      result.memberBaseCosts[member.id] = parseFloat(result.memberBaseCosts[member.id].toFixed(2));
      result.memberDiscountContributions[member.id] = parseFloat(result.memberDiscountContributions[member.id].toFixed(2));
      result.memberTaxContributions[member.id] = parseFloat(result.memberTaxContributions[member.id].toFixed(2));
      result.memberTipServiceContributions[member.id] = parseFloat(result.memberTipServiceContributions[member.id].toFixed(2));
      result.finalAmounts[member.id] = parseFloat(result.finalAmounts[member.id].toFixed(2));
      result.memberPayments[member.id] = parseFloat(result.memberPayments[member.id].toFixed(2));
    });

    // Round breakdown totals
    Object.keys(result.breakdown).forEach(key => {
      result.breakdown[key] = parseFloat(result.breakdown[key].toFixed(2));
    });
  }

  // Generate settlement suggestions (who owes whom)
  generateSettlements(finalAmounts, memberPayments, groupMembers) {
    console.log("generateSettlements: Received finalAmounts:", finalAmounts);
    console.log("generateSettlements: Received memberPayments:", memberPayments);

    const settlements = [];
    const netBalances = {};
    const memberMap = {};
    
    groupMembers.forEach(member => {
      memberMap[member.id] = member;
      netBalances[member.id] = (memberPayments[member.id] || 0) - (finalAmounts[member.id] || 0);
    });

    console.log("generateSettlements: Calculated net balances:", netBalances);

    // Create sorted arrays for optimization
    const creditors = Object.entries(netBalances)
      .filter(([, balance]) => balance > 0.001)
      .sort(([,a], [,b]) => b - a);
    
    const debtors = Object.entries(netBalances)
      .filter(([, balance]) => balance < -0.001)
      .map(([id, balance]) => [id, Math.abs(balance)])
      .sort(([,a], [,b]) => b - a);

    console.log("generateSettlements: Creditors (owed money):", creditors);
    console.log("generateSettlements: Debtors (owe money):", debtors);

    // Minimize transactions using greedy approach
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
      const [creditorId, creditAmount] = creditors[i];
      const [debtorId, debtAmount] = debtors[j];
      const settleAmount = Math.min(creditAmount, debtAmount);

      if (settleAmount > 0.01) { // Avoid tiny settlements
        settlements.push({
          from: debtorId,
          fromName: memberMap[debtorId].name,
          to: creditorId,
          toName: memberMap[creditorId].name,
          amount: parseFloat(settleAmount.toFixed(2))
        });
      }

      creditors[i][1] -= settleAmount;
      debtors[j][1] -= settleAmount;

      if (creditors[i][1] <= 0.01) i++;
      if (debtors[j][1] <= 0.01) j++;
    }

    console.log("generateSettlements: Settlements generated:", settlements);
    
    return settlements;
  }

  // Generate summary for export
  generateSummary(splitResult, groupData, billData) {
    return {
      groupName: groupData.name,
      billDate: billData.date,
      totalAmount: billData.grandTotal,
      subtotal: billData.subtotal,
      members: groupData.members,
      itemBreakdown: splitResult.itemSplits,
      memberTotals: splitResult.finalAmounts,
      memberPayments: splitResult.memberPayments,
      settlements: splitResult.settlements,
      breakdown: splitResult.breakdown,
      // Detailed contributions for transparency
      contributions: {
        baseCosts: splitResult.memberBaseCosts,
        discounts: splitResult.memberDiscountContributions,
        taxes: splitResult.memberTaxContributions,
        tipsAndService: splitResult.memberTipServiceContributions
      }
    };
  }

  // Utility method to validate split configuration
  validateSplitConfig(splitConfig, items, groupMembers) {
    const errors = [];
    
    // Check if all items are assigned to at least one member
    items.forEach(item => {
      const selectedMembers = splitConfig.itemSelections[item.id] || [];
      if (selectedMembers.length === 0) {
        errors.push(`Item "${item.name}" is not assigned to any member`);
      }
    });

    // Check if bill payer is specified
    if (!splitConfig.billPayment?.payerId) {
      errors.push("No bill payer specified");
    }

    // Check if all selected member IDs exist
    const memberIds = new Set(groupMembers.map(m => m.id));
    Object.values(splitConfig.itemSelections).forEach(memberList => {
      memberList.forEach(memberId => {
        if (!memberIds.has(memberId)) {
          errors.push(`Invalid member ID: ${memberId}`);
        }
      });
    });

    // Validate bill payment data
    if (splitConfig.billPayment?.payerId && !memberIds.has(splitConfig.billPayment.payerId)) {
      errors.push(`Invalid bill payer ID: ${splitConfig.billPayment.payerId}`);
    }

    // Validate custom ratios if provided
    if (splitConfig.customRatios) {
      Object.keys(splitConfig.customRatios).forEach(category => {
        const ratios = splitConfig.customRatios[category];
        if (ratios && typeof ratios === 'object') {
          Object.keys(ratios).forEach(memberId => {
            if (!memberIds.has(memberId)) {
              errors.push(`Invalid member ID in custom ratios: ${memberId}`);
            }
            if (typeof ratios[memberId] !== 'number' || ratios[memberId] < 0) {
              errors.push(`Invalid ratio for member ${memberId}: must be a non-negative number`);
            }
          });
        }
      });
    }

    return errors;
  }
}

// Export singleton instance
export const splittingService = new SplittingService();


