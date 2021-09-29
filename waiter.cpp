#include<iostream>
#include<vector>
#include<algorithm>
using namespace std;
int main()
{
 int n,m,o;
 int prime[3];
 vector<int> waiter;
 vector<int> b;
 cout<<"size of plates";
 cin>>n;
 cout<<"enter no. of iterations";
 cin>>m;
 cout<<"enter first "<<m<<"prime nos.\n";
 for(int i=0;i<m;i++)
 { cout<<i<<" prime=";
   cin>>prime[i];
 }
 for(int i=0;i<n;i++)
 {
   cout<<"enter plate no.\n";
   cin>>o;
   waiter.push_back(o);
 }
//for(auto ir=waiter.end()-1;ir<waiter.begin();--ir)
//{cout<<*ir;}
  for(int j=0;j<m;j++)
    {for(auto ir=waiter.end()-1;ir!=waiter.begin();--ir)
       {  if(*ir%prime[j]==0)
         {  b.push_back(*ir);
            waiter.erase(ir);
         }
       }

    }
  for(auto it=b.end()-1;it!=b.begin()-1;--it)
    {//cout<<waiter.size();
     cout<<*it;
    }
for(auto ir=waiter.begin();ir!=waiter.end();++ir)
{cout<<*ir;}

}
