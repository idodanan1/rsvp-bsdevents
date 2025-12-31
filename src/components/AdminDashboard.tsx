import React, { useState, useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { growService, Transaction } from '../services/growService';
import { Users, DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    totalCreditsSold: 0,
  });

  const user = useUserStore(state => state.user);

  useEffect(() => {
    if (!user?.isAdmin) {
      toast.error('אין לך הרשאות מנהל');
      return;
    }

    loadTransactions();
  }, [user]);

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const allTransactions = await growService.getAllTransactions();
      setTransactions(allTransactions || []);

      // Calculate stats
      const totalRevenue = allTransactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalCreditsSold = allTransactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + t.credits, 0);

      setStats({
        totalRevenue,
        totalTransactions: allTransactions.length,
        successfulTransactions: allTransactions.filter(t => t.status === 'success').length,
        failedTransactions: allTransactions.filter(t => t.status === 'failed').length,
        totalCreditsSold,
      });
    } catch (error: any) {
      toast.error('שגיאה בטעינת תשלומים');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'הצליח';
      case 'failed':
        return 'נכשל';
      case 'pending':
        return 'ממתין';
      default:
        return status;
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">אין לך הרשאות גישה</h1>
          <p className="text-gray-600">דף זה זמין למנהלים בלבד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-yellow-50 p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">דשבורד מנהל</h1>
          <p className="text-gray-600">ניהול תשלומים והכנסות</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">סה"כ הכנסות</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalRevenue.toFixed(2)} ש"ח</p>
              </div>
              <DollarSign className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">סה"כ תשלומים</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalTransactions}</p>
              </div>
              <CreditCard className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">תשלומים מוצלחים</p>
                <p className="text-3xl font-bold text-green-600">{stats.successfulTransactions}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">רשומות שנמכרו</p>
                <p className="text-3xl font-bold text-teal-600">{stats.totalCreditsSold}</p>
              </div>
              <Users className="w-12 h-12 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">היסטוריית תשלומים</h2>
            <button
              onClick={loadTransactions}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              רענן
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">טוען תשלומים...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">אין תשלומים עדיין</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">תאריך</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">משתמש</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">סכום</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">רשומות</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">סטטוס</th>
                    <th className="text-right py-3 px-4 text-gray-700 font-semibold">מזהה תשלום</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(transaction.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{transaction.userId}</td>
                      <td className="py-3 px-4 text-gray-700 font-semibold">{transaction.amount} ש"ח</td>
                      <td className="py-3 px-4 text-gray-700">{transaction.credits}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm font-mono">
                        {transaction.stripePaymentId || transaction.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

